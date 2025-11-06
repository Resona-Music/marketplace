import { register } from '#controllers/auth.controller.js';
import { Router, Request, Response } from 'express';

const router = Router();

router.post('/register', register);

router.post('/login', (_req: Request, res: Response) => {
  res.send('POST /api/auth/login');
});

router.post('/logout', (_req: Request, res: Response) => {
  res.send('POST /api/auth/logout');
});

export default router;
