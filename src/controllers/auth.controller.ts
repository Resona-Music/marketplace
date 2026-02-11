import { Request, Response, NextFunction } from 'express';
import logger from '#config/logger.js';
import {
  createUser,
  authenticateUser,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  getUserById,
  verifyToken,
  markEmailAsVerified,
  createVerificationToken,
  getUserByEmail,
  updatePassword,
  revokeAllRefreshTokensForUser,
} from '#services/auth.service.js';
import { cookies } from '#utils/cookies.js';
import { formatValidationError } from '#utils/format.js';
import { accessToken, refreshToken } from '#utils/jwt.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordResetSchema,
  resetPasswordSchema,
} from '#validations/auth.validations.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '#services/email.service.js';

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

    const verificationToken = await createVerificationToken(
      user.id,
      'email_verify'
    );
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      logger.warn(
        `Failed to send verification email to ${user.email}`,
        emailError
      );
    }

    const access = accessToken.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refresh = refreshToken.sign(user.id);
    const expiresAt = refreshToken.getExpiresAt();

    await createRefreshToken(user.id, refresh, expiresAt);

    cookies.set(res, 'accessToken', access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    cookies.set(res, 'refreshToken', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    logger.info(`User registered successfully: ${user.email}`);
    res.status(201).json({
      message: 'User registered',
      user: {
        id: user.id,
        fullname: user.fullName,
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

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
      return;
    }

    const user = await authenticateUser(validation.data);
    const access = accessToken.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refresh = refreshToken.sign(user.id);
    const expiresAt = refreshToken.getExpiresAt();

    await createRefreshToken(user.id, refresh, expiresAt);

    cookies.set(res, 'accessToken', access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    cookies.set(res, 'refreshToken', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    logger.info(`User logged in successfully: ${user.email}`);
    res.status(200).json({
      message: 'User logged in',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Login error', error);

    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await revokeRefreshToken(token);
    }

    cookies.clear(res, 'accessToken', { path: '/' });
    cookies.clear(res, 'refreshToken', { path: '/api/auth' });

    logger.info('User logged out successfully');
    res.status(200).json({
      message: 'User logged out',
    });
  } catch (error) {
    logger.error('Logout error', error);
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const payload = refreshToken.verify(token);
    const isValid = await validateRefreshToken(payload.userId, token);

    if (!isValid) {
      cookies.clear(res, 'accessToken', { path: '/' });
      cookies.clear(res, 'refreshToken', { path: '/api/auth' });

      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newAccess = accessToken.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'accessToken', newAccess, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    logger.info(`Access token refreshed for user: ${user.email}`);
    res.status(200).json({
      message: 'Access token refreshed',
    });
  } catch (error) {
    logger.error('Refresh token error', error);
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
      return;
    }

    const result = await verifyToken(validation.data.token, 'email_verify');

    if (!result) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    await markEmailAsVerified(result.userId);

    logger.info(`Email verified for user ID: ${result.userId}`);
    res.status(200).json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Email verification error', error);
    next(error);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessTokenCookie = req.cookies.accessToken;

    if (!accessTokenCookie) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const payload = accessToken.verify(accessTokenCookie);
    const user = await getUserById(payload.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = await createVerificationToken(user.id, 'email_verify');
    try {
      await sendVerificationEmail(user.email, token);
      logger.info(`Verification email resent to: ${user.email}`);
    } catch (emailError) {
      logger.warn(
        `Failed to resend verification email to ${user.email}`,
        emailError
      );
    }
    res.status(200).json({
      message: 'Verification email resent',
    });
  } catch (error) {
    logger.error('Resend verification email error', error);
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = forgotPasswordResetSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
      return;
    }

    const user = await getUserByEmail(validation.data.email);
    if (!user) {
      res
        .status(200)
        .json({ error: 'If that email exists, a reset link was sent' });
      return;
    }

    const token = await createVerificationToken(user.id, 'password_reset');
    try {
      await sendPasswordResetEmail(user.email, token);
      logger.info(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      logger.warn(
        `Failed to send password reset email to ${user.email}`,
        emailError
      );
    }
    res.status(200).json({
      message: 'If that email exists, a reset link was sent',
    });
  } catch (error) {
    logger.error('Forgot password error', error);
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
      return;
    }

    const result = await verifyToken(validation.data.token, 'password_reset');

    if (!result) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    await updatePassword(result.userId, validation.data.password);
    await revokeAllRefreshTokensForUser(result.userId);

    logger.info(`Password reset successfully for user ID: ${result.userId}`);
    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset password error', error);
    next(error);
  }
};
