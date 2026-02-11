import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().max(255),
  username: z.string().trim().min(3).max(20),
  email: z.email().max(255).toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters long").max(128),
});

export const loginSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const forgotPasswordResetSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().length(64, "Invalid token"),
  password: z.string().min(6, "Password must be at least 6 characters long").max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordResetInput = z.infer<typeof forgotPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;