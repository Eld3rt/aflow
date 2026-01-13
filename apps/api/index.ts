import express from 'express';
import dotenv from 'dotenv';
import { workflowsRouter } from './routes/workflows.js';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/workflows', workflowsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`);
});
