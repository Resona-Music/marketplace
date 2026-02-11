import z from "zod";

export const userIdSchema = z.object({
    id: z.coerce.number().int().positive("ID must be a positive integer"),
});

export const updateUserSchema = z.object({
    username: z.string().trim().min(3).max(20).optional(),
    email: z.email().optional(),
    role: z.string().min(1).max(50).optional(),
}).refine((data) => data.username || data.email || data.role, {
    message: "At least one field (username, email, or role) must be provided",
});
