import express from 'express';
import dotenv from 'dotenv';
import { workflowsRouter } from './routes/workflows.js';
import { webhooksRouter } from './routes/webhooks.js';
import { initializeCronSchedules } from './scheduler.js';

dotenv.config();

const app = express();
app.use(express.json());

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
