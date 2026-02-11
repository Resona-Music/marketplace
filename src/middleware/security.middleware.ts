import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';
import { NextFunction, Request, Response } from 'express';

export const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = req.user?.role;
    let limit;

    switch (role) {
      case 'admin':
        limit = 20;
        break;
      case 'user':
        limit = 10;
        break;
      default:
        limit = 5;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
      })
    );

    const decision = await client.protect(req);

    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot request blocked', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      res
        .status(403)
        .json({
          error: 'Forbidden',
          message: 'Automated requests are not allowed',
        });
      return;
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Shield Blocked request', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        mathod: req.method,
      });

      res
        .status(403)
        .json({
          error: 'Forbidden',
          message: 'Request blocked by security policy',
        });
      return;
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      res
        .status(403)
        .json({ error: 'Forbidden', message: 'Too many requests' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Arcjet error:', error);
    console.error('Arcjet error:', error);

    res.status(500).json({ message: 'Internal Server Error' });
  }
};
