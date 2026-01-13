import { Worker } from 'bullmq';
import {
  redisConnection,
  type WorkflowExecutionJobData,
} from '@aflow/queue';

console.log('[worker] started');

// Create worker to process jobs
const worker = new Worker<WorkflowExecutionJobData>(
  'workflow-execution',
  async (job) => {
    try {
      console.log(`[worker] Job started: ${job.id}`);
      console.log(`[worker] workflowId: ${job.data.workflowId}`);

      // Job processing logic would go here
      // For now, we just log and complete the job

      return { completed: true };
    } catch (error) {
      // Handle unexpected errors gracefully
      console.error(`[worker] Error processing job ${job.id}:`, error);
      throw error; // Re-throw to mark job as failed, but worker continues
    }
  },
  {
    connection: redisConnection,
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
