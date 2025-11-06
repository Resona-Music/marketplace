import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(20),
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
