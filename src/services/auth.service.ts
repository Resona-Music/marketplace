import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { users } from '#models/user.model.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const BCRYPT_ROUNDS = parseInt(process.env.ROUNDS || '10', 10);

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error(`Error hashing password: ${error}`);
    throw new Error('Error hashing password');
  }
};

interface CreateUserParams {
  username: string;
  email: string;
  password: string;
}

interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
}

export const createUser = async ({
  username,
  email,
  password,
}: CreateUserParams): Promise<UserResponse> => {
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
        username,
        email,
        password: passwordHash,
        role: 'user',
      })
      .returning({
        id: users.id,
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
