import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface WorkflowExecutionJobData {
  workflowId: string;
  triggerPayload?: Record<string, unknown>;
}

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '5012', 10),
  maxRetriesPerRequest: null,
});

export const workflowExecutionQueue = new Queue<WorkflowExecutionJobData>(
  'workflow-execution',
  {
    connection: redisConnection,
  },
);
