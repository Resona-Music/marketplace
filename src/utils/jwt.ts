import logger from '#config/logger.js';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET environment variable is required');
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AccessTokenPayload {
  userId: number;
  email: string;
  role: string;
  type: 'access';
}

export type RefreshTokenPayload = {
  userId: number;
  type: 'refresh';
};

export const accessToken = {
  sign: (payload: Omit<AccessTokenPayload, 'type'>): string => {
    try {
      return jwt.sign({ ...payload, type: 'access' }, JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      } as any);
    } catch (error) {
      logger.error('Failed to sign JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
  verify: (token: string): AccessTokenPayload => {
    try {
      const decoded = jwt.verify(
        token,
        JWT_ACCESS_SECRET
      ) as AccessTokenPayload;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      logger.error('Failed to verify JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
};

export const refreshToken = {
  sign: (userId: number): string => {
    try {
      return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      } as any);
    } catch (error) {
      logger.error('Failed to sign refresh JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
  verify: (token: string): RefreshTokenPayload => {
    try {
      const decoded = jwt.verify(
        token,
        JWT_REFRESH_SECRET
      ) as RefreshTokenPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      logger.error('Failed to verify refresh JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
  getExpiresAt: (): Date => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now;
  },
};
