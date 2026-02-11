import logger from "#config/logger.js";
import {
    getAllUsers,
    getUserById as getUserByIdService,
    updateUser as updateUserService,
    deleteUser as deleteUserService
} from "#services/users.service.js";
import { formatValidationError } from "#utils/format.js";
import { userIdSchema, updateUserSchema } from "#validations/users.validations.js";
import { Request, Response, NextFunction } from "express";

export const fetchAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        logger.info("Getting users...")

        const allUsers = await getAllUsers()

        res.json({
            message: "Successfully retrieved users",
            users: allUsers,
            count: allUsers.length
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
}

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const validation = userIdSchema.safeParse(req.params);

        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: formatValidationError(validation.error),
            });
            return;
        }

        logger.info(`Getting user by ID: ${validation.data.id}`);

        const user = await getUserByIdService(validation.data.id);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            message: "Successfully retrieved user",
            user,
        });
    } catch (error) {
        logger.error(error);
        next(error);
    }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idValidation = userIdSchema.safeParse(req.params);

        if (!idValidation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: formatValidationError(idValidation.error),
            });
            return;
        }

        const bodyValidation = updateUserSchema.safeParse(req.body);

        if (!bodyValidation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: formatValidationError(bodyValidation.error),
            });
            return;
        }

        const targetUserId = idValidation.data.id;
        const requestingUser = req.user!;

        // Non-admin users can only update their own information
        if (requestingUser.role !== 'admin' && requestingUser.userId !== targetUserId) {
            res.status(403).json({ error: 'You can only update your own information' });
            return;
        }

        // Only admins can change user roles
        if (bodyValidation.data.role && requestingUser.role !== 'admin') {
            res.status(403).json({ error: 'Only admins can change user roles' });
            return;
        }

        logger.info(`Updating user ID: ${targetUserId}`);

        await updateUserService(targetUserId, bodyValidation.data);

        res.json({ message: "User updated successfully" });
    } catch (error) {
        logger.error(error);

        if (error instanceof Error) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            if (error.message === 'Username is already taken' || error.message === 'Email is already in use') {
                res.status(409).json({ error: error.message });
                return;
            }
        }

        next(error);
    }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const validation = userIdSchema.safeParse(req.params);

        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: formatValidationError(validation.error),
            });
            return;
        }

        const targetUserId = validation.data.id;
        const requestingUser = req.user!;

        // Non-admin users can only delete their own account
        if (requestingUser.role !== 'admin' && requestingUser.userId !== targetUserId) {
            res.status(403).json({ error: 'You can only delete your own account' });
            return;
        }

        const user = await getUserByIdService(targetUserId);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        logger.info(`Deleting user ID: ${targetUserId}`);

        await deleteUserService(targetUserId);

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        logger.error(error);
        next(error);
    }
}
