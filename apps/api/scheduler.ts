import cron from 'node-cron';
import { prisma } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';

/**
 * Initialize cron schedules for all active workflows with cron triggers.
 * Called on application startup to register all cron-based workflow executions.
 */
export async function initializeCronSchedules(): Promise<void> {
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

    for (const workflow of workflows) {
      if (!workflow.trigger) {
        continue;
      }

      const triggerConfig = workflow.trigger.config as Record<string, unknown>;
      const cronExpression = triggerConfig.cronExpression;

      // Validate cron expression exists and is a string
      if (!cronExpression || typeof cronExpression !== 'string') {
        console.error(
          `[scheduler] Invalid cron expression for workflow ${workflow.id}: missing or not a string`,
        );
        continue;
      }

      // Validate cron expression format
      if (!cron.validate(cronExpression)) {
        console.error(
          `[scheduler] Invalid cron expression for workflow ${workflow.id}: ${cronExpression}`,
        );
        continue;
      }

      // Register cron job
      cron.schedule(cronExpression, () => {
        console.log(`[scheduler] Cron tick for workflow ${workflow.id}`);
        // Enqueue workflow execution job with empty trigger payload
        workflowExecutionQueue
          .add('workflow-execution', {
            workflowId: workflow.id,
            triggerPayload: {},
          })
          .catch((error) => {
            console.error(
              `[scheduler] Failed to enqueue job for workflow ${workflow.id}:`,
              error,
            );
          });
      });

      console.log(
        `[scheduler] Registered cron schedule for workflow ${workflow.id}: ${cronExpression}`,
      );
    }

    console.log('[scheduler] Cron schedules initialized');
  } catch (error) {
    console.error('[scheduler] Error initializing cron schedules:', error);
    // Don't throw - allow application to start even if scheduler fails
  }
}
