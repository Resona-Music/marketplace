import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { refreshTokens, users, verificationTokens } from '#models/schema.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';

const BCRYPT_ROUNDS = parseInt(process.env.ROUNDS || '10', 10);

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error(`Error hashing password: ${error}`);
    throw new Error('Error hashing password');
  }
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error(`Error comparing password: ${error}`);
    throw new Error('Error comparing password');
  }
};

export const hashToken = (token: string): string => {
  try {
    return crypto.createHash("sha256").update(token).digest("hex");
  } catch (error) {
    logger.error(`Error hashing token: ${error}`);
    throw new Error('Error hashing token');
  }
};

interface UserResponse {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
}

export const createUser = async ({
  fullName,
  username,
  email,
  password,
}: { fullName: string; username: string; email: string; password: string }): Promise<UserResponse> => {
  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        fullName,
        username,
        email,
        password: passwordHash,
        role: 'user',
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return newUser;
  } catch (error) {
    logger.error(`Error creating user: ${error}`);
    throw error;
  }
};

export const authenticateUser = async ({
  email,
  password,
}: { email: string; password: string }): Promise<UserResponse> => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  } catch (error) {
    logger.error(`Error authenticating user: ${error}`);
    throw error;
  }
};

export const createRefreshToken = async (
  userId: number,
  token: string,
  expiresAt: Date
): Promise<void> => {
  try {
    const tokenHash = hashToken(token);

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  } catch (error) {
    logger.error(`Error creating refresh token: ${error}`);
    throw new Error('Error creating refresh token');
  }
};

export const validateRefreshToken = async (
  userId: number,
  token: string
): Promise<boolean> => {
  try {
    const tokenHash = hashToken(token);

    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt)
        )
      )
      .limit(1);
    
      return !!storedToken;
  } catch (error) {
    logger.error(`Error validating refresh token: ${error}`);
    throw new Error('Error validating refresh token');
  }
};

export const revokeRefreshToken = async (
  token: string
): Promise<void> => {
  try {
    const tokenHash = hashToken(token);

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  } catch (error) {
    logger.error(`Error revoking refresh token: ${error}`);
    throw new Error('Error revoking refresh token');
  }
};

export const revokeAllRefreshTokensForUser = async (
  userId: number
): Promise<void> => {
  try {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt)
        )
      );
  } catch (error) {
    logger.error(`Error revoking all refresh tokens for user: ${error}`);
    throw new Error('Error revoking refresh tokens for user');
  }
};

export const getUserById = async (userId: number): Promise<UserResponse | null> => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch (error) {
    logger.error(`Error fetching user by ID: ${error}`);
    throw new Error('Error fetching user by ID');
  }
};

export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const createVerificationToken = async (userId: number, type: 'email_verify' | 'password_reset'): Promise<string> => {
  try {
    const token = generateToken();
    const expiresAt = new Date();

    if (type === 'email_verify') {
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours for email verification
    } else if (type === 'password_reset') {
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour for password reset
    }

    await db.insert(verificationTokens).values({
      userId,
      token,
      type,
      expiresAt,
    });

    return token
  } catch (error) {
    logger.error(`Error creating verification token: ${error}`);
    throw new Error('Error creating verification token');
  }
};

export const verifyToken = async (token: string, type: 'email_verify' | 'password_reset'): Promise<{ userId: number } | null> => {
  try {
    const [found] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, type),
          isNull(verificationTokens.usedAt),
        )
      )
      .limit(1);

    if (!found) return null;
    if (new Date() > found.expiresAt) return null;

    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, found.id));

    return { userId: found.userId };
  } catch (error) {
    logger.error(`Error verifying token: ${error}`);
    throw new Error('Error verifying token');
  }
};

export const markEmailAsVerified = async (userId: number) => {
  try {
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    logger.error(`Error marking email as verified: ${error}`);
    throw new Error('Error marking email as verified');
  }
};

export const updatePassword = async (userId: number, newPassword: string) => {
  try {
    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, userId));
  } catch (error) {
    logger.error(`Error updating password: ${error}`);
    throw new Error('Error updating password');
  }
};

export const getUserByEmail = async (email: string): Promise<UserResponse | null> => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  } catch (error) {
    logger.error(`Error fetching user by email: ${error}`);
    throw new Error('Error fetching user by email');
  }
};