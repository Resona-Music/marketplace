import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';
import { requireAuth, requireRole } from '#middleware/auth.middleware.js';
import { Router } from 'express';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), fetchAllUsers);
router.get('/:id', requireAuth, getUserById);
router.put('/:id', requireAuth, updateUser);
router.delete('/:id', requireAuth, requireRole('admin'), deleteUser);

export default router;
