import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { users } from '#models/schema.js';
import { eq } from 'drizzle-orm';

interface UpdateUserParams {
  username?: string;
  email?: string;
  role?: string;
}

export const getAllUsers = async () => {
  try {
    return await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export const getUserById = async (id: number) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
};

export const updateUser = async (
  userId: number,
  data: UpdateUserParams
): Promise<void> => {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    if (data.username) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, data.username))
        .limit(1);

      if (existing && existing.id !== userId) {
        throw new Error('Username is already taken');
      }
    }

    if (data.email) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existing && existing.id !== userId) {
        throw new Error('Email is already in use');
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.username) updateData.username = data.username;
    if (data.email) {
      updateData.email = data.email;
      updateData.emailVerified = null;
    }
    if (data.role) updateData.role = data.role;

    await db.update(users).set(updateData).where(eq(users.id, userId));
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    logger.error('Error deleting user:', error);
    throw error;
  }
};
