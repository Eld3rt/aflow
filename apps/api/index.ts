import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { workflowsRouter } from './routes/workflows.js';
import { webhooksRouter } from './routes/webhooks.js';
import { initializeCronSchedules } from './scheduler.js';
import { requireAuth, type AuthenticatedRequest } from './utils/auth.js';

dotenv.config();

const app = express();

// Configure CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Authentication middleware for protected routes
app.use('/workflows', async (req, res, next) => {
  const authResult = await requireAuth(req as AuthenticatedRequest);
  if (!authResult) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/workflows', workflowsRouter);
app.use('/webhooks', webhooksRouter);

const PORT = process.env.PORT || 3001;

// Initialize cron schedules on startup
initializeCronSchedules().then(() => {
  app.listen(PORT, () => {
    console.log(`[api] listening on port ${PORT}`);
  });
});
