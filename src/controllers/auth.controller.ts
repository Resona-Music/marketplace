import { Request, Response, NextFunction } from 'express';
import logger from '#config/logger.js';
import { createUser } from '#services/auth.service.js';
import { cookies } from '#utils/cookies.js';
import { formatValidationError } from '#utils/format.js';
import { jwttoken } from '#utils/jwt.js';
import { registerSchema } from '#validations/auth.validations.js';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
      return;
    }

    const user = await createUser(validation.data);
    const token = jwttoken.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);

    logger.info(`User registered successfully: ${user.email}`);
    res.status(201).json({
      message: 'User registered',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Register error', error);

    if (error instanceof Error && error.message === 'User already exists') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    next(error);
  }
};
