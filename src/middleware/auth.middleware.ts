import { Request, Response, NextFunction } from 'express';
import { accessToken, AccessTokenPayload } from '#utils/jwt.js';
import logger from '#config/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      res.status(401).json({ error: 'No access token provided' });
      return;
    }

    const payload = accessToken.verify(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(401).json({ error: 'Invalid access token' });
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies.accessToken;

    if (token) {
      const payload = accessToken.verify(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', error);
    next();
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization error', error);
      res.status(403).json({ error: 'Forbidden' });
    }
  };
};
