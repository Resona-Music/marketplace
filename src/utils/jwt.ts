import logger from '#config/logger.js';
import jwt, { JwtPayload } from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

interface TokenPayload {
  userId: number;
  email: string;
  role?: string;
}

interface JwtHelpers {
  sign: (payload: TokenPayload) => string;
  verify: (token: string) => JwtPayload | TokenPayload;
}

export const jwttoken: JwtHelpers = {
  sign: (payload: TokenPayload): string => {
    try {
      // Type assertion needed due to strict typing in @types/jsonwebtoken
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
    } catch (error) {
      logger.error('Failed to sign JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
  verify: (token: string): JwtPayload | TokenPayload => {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload | TokenPayload;
    } catch (error) {
      logger.error('Failed to verify JWT token', error);
      throw new Error('Failed to authenticate token');
    }
  },
};
