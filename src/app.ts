import express, { Request, Response, Application } from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';
import usersRoutes from '#routes/users.routes.js';
import { securityMiddleware } from '#middleware/security.middleware.js';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5500'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim() )}}));
app.use(securityMiddleware);

app.get('/', (_req: Request, res: Response) => {
  logger.info('Hello from API!');
  res.status(200).send('Hello from API!');
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
})

export default app;
