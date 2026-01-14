import { Worker } from 'bullmq';
import { redisConnection, type WorkflowExecutionJobData } from '@aflow/queue';
import {
  WorkflowExecutor,
  stepExecutorRegistry,
  TransformActionExecutor,
} from '@aflow/workflow-core';
import {
  HttpActionExecutor,
  EmailActionExecutor,
  TelegramActionExecutor,
  DatabaseActionExecutor,
} from '@aflow/integrations';

console.log('[worker] started');

// Register step executors
stepExecutorRegistry.register('http', new HttpActionExecutor());
stepExecutorRegistry.register('email', new EmailActionExecutor());
stepExecutorRegistry.register('telegram', new TelegramActionExecutor());
stepExecutorRegistry.register('database', new DatabaseActionExecutor());
stepExecutorRegistry.register('transform', new TransformActionExecutor());

// Create workflow executor instance
const workflowExecutor = new WorkflowExecutor();

// Create worker to process jobs
const worker = new Worker<WorkflowExecutionJobData>(
  'workflow-execution',
  async (job) => {
    try {
      console.log(`[worker] Job started: ${job.id}`);
      console.log(`[worker] workflowId: ${job.data.workflowId}`);

      // Execute workflow
      const result = await workflowExecutor.execute(
        job.data.workflowId,
        job.data.triggerPayload,
      );

      if (!result.success) {
        throw new Error(result.error || 'Workflow execution failed');
      }

      console.log(`[worker] Job completed: ${job.id}`);
      return {
        completed: true,
        context: result.context,
      };
    } catch (error) {
      // Handle unexpected errors gracefully
      console.error(`[worker] Error processing job ${job.id}:`, error);
      throw error; // Re-throw to mark job as failed, but worker continues
    }
  },
  {
    connection: redisConnection,
    // Retry configuration: Step-level retries are handled in WorkflowExecutor
    // Job-level retries are configured when enqueuing jobs (see webhooks.ts)
    limiter: {
      max: 10, // Max jobs processed concurrently
      duration: 1000, // Per duration (ms)
    },
  },
);

// Handle worker errors gracefully
worker.on('error', (error) => {
  console.error('[worker] Worker error:', error);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] Job ${job?.id} failed:`, error);
});

console.log('[worker] Connected to workflow-execution queue');
