import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface WorkflowExecutionJobData {
  workflowId: string;
  triggerPayload?: Record<string, unknown>;
  executionId?: string; // For resuming paused executions
}

export const redisConnection = 
 new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    })
;

export const workflowExecutionQueue = new Queue<WorkflowExecutionJobData>(
  'workflow-execution',
  {
    connection: redisConnection,
  }
);
