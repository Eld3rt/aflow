import { Worker } from 'bullmq';
import {
  redisConnection,
  workflowExecutionQueue,
  type WorkflowExecutionJobData,
} from '@aflow/queue';
import { prisma } from '@aflow/db';
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
  NotificationService,
} from '@aflow/integrations';
import { syncSchedulerJobs } from '@aflow/queue';

console.log('[worker] started');

// Register step executors
stepExecutorRegistry.register('http', new HttpActionExecutor());
stepExecutorRegistry.register('email', new EmailActionExecutor());
stepExecutorRegistry.register('telegram', new TelegramActionExecutor());
stepExecutorRegistry.register('database', new DatabaseActionExecutor());
stepExecutorRegistry.register('transform', new TransformActionExecutor());

// Create workflow executor instance
const workflowExecutor = new WorkflowExecutor();

// Create notification service instance
const notificationService = new NotificationService();

// Create worker to process jobs
const worker = new Worker<WorkflowExecutionJobData>(
  'workflow-execution',
  async (job) => {
    try {
      console.log(`[worker] Job started: ${job.id}`);
      console.log(`[worker] workflowId: ${job.data.workflowId}`);

      // Optional safety check: Verify workflow is still enabled before execution
      // This handles edge cases where workflow was disabled after job was scheduled
      // Also load trigger to populate triggerPayload for cron triggers
      const workflow = await prisma.workflow.findUnique({
        where: { id: job.data.workflowId },
        include: {
          trigger: true,
        },
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${job.data.workflowId}`);
      }

      if (workflow.status !== 'active') {
        console.log(
          `[worker] Skipping execution for workflow ${job.data.workflowId} - status is ${workflow.status}`,
        );
        return {
          skipped: true,
          reason: `Workflow is ${workflow.status}`,
        };
      }

      // Populate triggerPayload for cron triggers if it's empty
      // Cron triggers need triggeredAt timestamp at execution time
      let triggerPayload = job.data.triggerPayload;
      if (
        workflow.trigger?.type === 'cron' &&
        (!triggerPayload || Object.keys(triggerPayload).length === 0)
      ) {
        triggerPayload = {
          triggeredAt: new Date().toISOString(),
        };
      }

      // If executionId is provided, check execution status
      if (job.data.executionId) {
        const execution = await prisma.workflowExecution.findUnique({
          where: { id: job.data.executionId },
        });

        if (!execution) {
          throw new Error(`Execution not found: ${job.data.executionId}`);
        }

        // If execution is already completed or failed, skip processing
        if (execution.status === 'completed' || execution.status === 'failed') {
          console.log(
            `[worker] Skipping execution ${execution.id} - status: ${execution.status}`,
          );
          return {
            skipped: true,
            reason: execution.status,
          };
        }

        // If execution is paused, check if we should process it
        if (execution.status === 'paused') {
          // Check if it's a delayed retry (pauseUntil)
          if (execution.resumeAt) {
            const now = new Date();
            const resumeAt = execution.resumeAt;

            // If resumeAt is in the future, skip processing (shouldn't happen if job was enqueued with delay)
            if (resumeAt > now) {
              console.log(
                `[worker] Skipping paused execution ${execution.id} - resumeAt: ${resumeAt.toISOString()}`,
              );
              return {
                skipped: true,
                reason: 'paused',
                resumeAt: resumeAt.toISOString(),
              };
            }
            // resumeAt has passed, continue with resume
          } else {
            // Manual pause - skip processing (should be resumed via API)
            console.log(
              `[worker] Skipping paused execution ${execution.id} - manual resume required`,
            );
            return {
              skipped: true,
              reason: 'paused',
            };
          }
        }
        // If execution is running, continue processing (might be a retry)
      }

      // Execute workflow (new execution or resuming paused execution)
      const result = await workflowExecutor.execute(
        job.data.workflowId,
        triggerPayload,
        job.data.executionId,
      );

      // If execution was paused, handle delayed retry if needed and send notifications
      if (result.paused && result.executionId) {
        console.log(
          `[worker] Execution paused: ${result.executionId}, resumeAt: ${result.resumeAt || 'manual'}`,
        );

        // Load execution details for notification
        const execution = await prisma.workflowExecution.findUnique({
          where: { id: result.executionId },
        });

        if (execution) {
          // Send pause notification (fire-and-forget)
          notificationService
            .sendNotifications(
              job.data.workflowId,
              result.executionId,
              'paused',
              execution.currentStepOrder,
              execution.error,
              execution.pausedAt,
              execution.resumeAt,
            )
            .catch((error) => {
              // Notification errors should not affect execution
              console.error(
                `[worker] Error sending pause notification:`,
                error,
              );
            });
        }

        // If resumeAt is set (pauseUntil), enqueue delayed job
        if (result.resumeAt) {
          const resumeAt = new Date(result.resumeAt);
          const now = new Date();
          const delay = resumeAt.getTime() - now.getTime();

          if (delay > 0) {
            console.log(
              `[worker] Enqueuing delayed resume job for execution ${result.executionId} at ${resumeAt.toISOString()}`,
            );
            await workflowExecutionQueue.add(
              'workflow-execution',
              {
                workflowId: job.data.workflowId,
                executionId: result.executionId,
                triggerPayload: {}, // Context is loaded from persisted execution
              },
              {
                delay, // BullMQ delay in milliseconds
                attempts: 2,
                backoff: {
                  type: 'exponential',
                  delay: 2000,
                },
              },
            );
          }
        }

        return {
          paused: true,
          executionId: result.executionId,
          resumeAt: result.resumeAt,
        };
      }

      if (!result.success) {
        // Load execution details for notification before throwing
        if (result.executionId) {
          const execution = await prisma.workflowExecution.findUnique({
            where: { id: result.executionId },
          });

          if (execution) {
            // Send failure notification (fire-and-forget)
            notificationService
              .sendNotifications(
                job.data.workflowId,
                result.executionId,
                'failed',
                execution.currentStepOrder,
                execution.error,
              )
              .catch((error) => {
                // Notification errors should not affect execution
                console.error(
                  `[worker] Error sending failure notification:`,
                  error,
                );
              });
          }
        }

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

// Sync scheduler jobs on worker startup
syncSchedulerJobs()
  .then(() => {
    console.log('[worker] Scheduler jobs synced on startup');
  })
  .catch((error: unknown) => {
    console.error('[worker] Error syncing scheduler jobs on startup:', error);
    // Don't exit - worker can still process jobs even if scheduler sync fails
  });
