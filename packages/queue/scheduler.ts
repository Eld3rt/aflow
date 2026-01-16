import { prisma } from '@aflow/db';
import { workflowExecutionQueue } from './queue.js';

/**
 * Create or update a repeatable scheduler job for a workflow with a cron trigger.
 * Uses workflowId as the deterministic jobId to ensure idempotency.
 */
export async function createSchedulerJob(workflowId: string): Promise<void> {
  try {
    // Load workflow with trigger
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        trigger: true,
      },
    });

    if (!workflow) {
      console.error(`[scheduler] Workflow not found: ${workflowId}`);
      return;
    }

    // Only create job if workflow is active and has cron trigger
    if (workflow.status !== 'active') {
      console.log(
        `[scheduler] Skipping job creation for workflow ${workflowId}: status is ${workflow.status}`,
      );
      return;
    }

    if (!workflow.trigger || workflow.trigger.type !== 'cron') {
      console.log(
        `[scheduler] Skipping job creation for workflow ${workflowId}: no cron trigger`,
      );
      return;
    }

    const triggerConfig = workflow.trigger.config as Record<string, unknown>;
    const cronExpression = triggerConfig.cronExpression;

    // Validate cron expression exists and is a string
    if (!cronExpression || typeof cronExpression !== 'string') {
      console.error(
        `[scheduler] Invalid cron expression for workflow ${workflowId}: missing or not a string`,
      );
      return;
    }

    // Create or update repeatable job
    // Using workflowId as jobId ensures idempotency - if job exists, it will be updated
    await workflowExecutionQueue.add(
      'workflow-execution',
      {
        workflowId: workflow.id,
        triggerPayload: {},
      },
      {
        jobId: `scheduler-${workflowId}`, // Deterministic job ID
        repeat: {
          pattern: cronExpression, // BullMQ supports cron patterns
        },
      },
    );

    console.log(
      `[scheduler] Created repeatable job for workflow ${workflowId}: ${cronExpression}`,
    );
  } catch (error) {
    console.error(
      `[scheduler] Error creating scheduler job for workflow ${workflowId}:`,
      error,
    );
    // Don't throw - allow workflow operations to continue even if scheduler fails
  }
}

/**
 * Remove a repeatable scheduler job for a workflow.
 */
export async function removeSchedulerJob(workflowId: string): Promise<void> {
  try {
    // Remove repeatable job by jobId pattern
    // BullMQ stores repeatable jobs with a key pattern
    const jobId = `scheduler-${workflowId}`;

    // Get all repeatable jobs to find the one matching our workflow
    const repeatableJobs = await workflowExecutionQueue.getRepeatableJobs();

    // Find the repeatable job for this workflow
    const jobToRemove = repeatableJobs.find((job) => job.id === jobId);

    if (jobToRemove) {
      await workflowExecutionQueue.removeRepeatableByKey(jobToRemove.key);
      console.log(
        `[scheduler] Removed repeatable job for workflow ${workflowId}`,
      );
    } else {
      console.log(
        `[scheduler] No repeatable job found for workflow ${workflowId} (may have been already removed)`,
      );
    }
  } catch (error) {
    console.error(
      `[scheduler] Error removing scheduler job for workflow ${workflowId}:`,
      error,
    );
    // Don't throw - allow workflow operations to continue even if scheduler fails
  }
}

/**
 * Sync scheduler jobs with database state.
 * Loads all active workflows with cron triggers and ensures repeatable jobs exist.
 * Removes orphaned jobs (jobs for workflows that no longer exist or are disabled).
 * Called on worker startup to ensure consistency.
 */
export async function syncSchedulerJobs(): Promise<void> {
  try {
    // Load all active workflows with cron triggers
    const workflows = await prisma.workflow.findMany({
      where: {
        status: 'active',
        trigger: {
          type: 'cron',
        },
      },
      include: {
        trigger: true,
      },
    });

    console.log(
      `[scheduler] Found ${workflows.length} active workflow(s) with cron triggers`,
    );

    // Get all existing repeatable jobs
    const existingRepeatableJobs =
      await workflowExecutionQueue.getRepeatableJobs();
    const existingWorkflowIds = new Set(
      existingRepeatableJobs
        .map((job) => {
          // Extract workflowId from jobId (format: scheduler-{workflowId})
          const match = job.id?.match(/^scheduler-(.+)$/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null),
    );

    const targetWorkflowIds = new Set(
      workflows
        .filter((w) => {
          if (!w.trigger) return false;
          const triggerConfig = w.trigger.config as Record<string, unknown>;
          const cronExpression = triggerConfig.cronExpression;
          return (
            cronExpression &&
            typeof cronExpression === 'string' &&
            cronExpression.trim().length > 0
          );
        })
        .map((w) => w.id),
    );

    // Create jobs for workflows that should have them but don't
    for (const workflow of workflows) {
      if (!workflow.trigger) continue;

      const triggerConfig = workflow.trigger.config as Record<string, unknown>;
      const cronExpression = triggerConfig.cronExpression;

      if (
        !cronExpression ||
        typeof cronExpression !== 'string' ||
        cronExpression.trim().length === 0
      ) {
        continue;
      }

      if (!existingWorkflowIds.has(workflow.id)) {
        await createSchedulerJob(workflow.id);
      } else {
        // Job exists, but verify cron expression hasn't changed
        // If changed, remove old and create new
        const existingJob = existingRepeatableJobs.find(
          (job) => job.id === `scheduler-${workflow.id}`,
        );
        if (existingJob && existingJob.pattern !== cronExpression) {
          console.log(
            `[scheduler] Cron expression changed for workflow ${workflow.id}, updating job`,
          );
          await removeSchedulerJob(workflow.id);
          await createSchedulerJob(workflow.id);
        }
      }
    }

    // Remove orphaned jobs (jobs for workflows that no longer exist or are disabled)
    for (const workflowId of Array.from(existingWorkflowIds)) {
      if (!targetWorkflowIds.has(workflowId)) {
        console.log(
          `[scheduler] Removing orphaned job for workflow ${workflowId}`,
        );
        await removeSchedulerJob(workflowId);
      }
    }

    console.log('[scheduler] Scheduler jobs synced');
  } catch (error) {
    console.error('[scheduler] Error syncing scheduler jobs:', error);
    // Don't throw - allow application to start even if scheduler fails
  }
}
