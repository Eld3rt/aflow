import { prisma } from '@aflow/db';
import { EmailActionExecutor } from '../email/email-action.js';
import { HttpActionExecutor } from '../http/http-action.js';
import type { NotificationPayload } from './notification-payload.js';
import { buildNotificationPayload } from './notification-payload.js';

/**
 * Notification service.
 * Sends fire-and-forget notifications for workflow execution failures and pauses.
 * Reuses existing Email and HTTP integrations.
 */
export class NotificationService {
  private emailExecutor: EmailActionExecutor;
  private httpExecutor: HttpActionExecutor;

  constructor() {
    this.emailExecutor = new EmailActionExecutor();
    this.httpExecutor = new HttpActionExecutor();
  }

  /**
   * Send notifications for a workflow execution failure or pause.
   * Fire-and-forget: errors are caught and logged, but don't throw.
   * @param workflowId - Workflow ID
   * @param executionId - Execution ID
   * @param status - Execution status (failed or paused)
   * @param currentStepOrder - Current step order (failed step)
   * @param errorMessage - Error message
   * @param pausedAt - Pause timestamp (optional)
   * @param resumeAt - Resume timestamp (optional)
   */
  async sendNotifications(
    workflowId: string,
    executionId: string,
    status: 'failed' | 'paused',
    currentStepOrder: number | null,
    errorMessage: string | null,
    pausedAt?: Date | null,
    resumeAt?: Date | null,
  ): Promise<void> {
    try {
      // Load workflow with notification configs and steps
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          notificationConfigs: true,
          steps: {
            orderBy: { order: 'asc' },
            select: {
              order: true,
              type: true,
            },
          },
        },
      });

      if (!workflow) {
        console.error(
          `[notifications] Workflow not found: ${workflowId}, skipping notifications`,
        );
        return;
      }

      // Filter notification configs based on status
      const relevantConfigs = workflow.notificationConfigs.filter((config) => {
        if (status === 'failed') {
          return config.onFailure;
        }
        if (status === 'paused') {
          return config.onPause;
        }
        return false;
      });

      if (relevantConfigs.length === 0) {
        // No notifications configured for this event
        return;
      }

      // Build notification payload
      const payload = buildNotificationPayload(
        workflowId,
        executionId,
        status,
        currentStepOrder,
        errorMessage,
        pausedAt,
        resumeAt,
        workflow.steps,
      );

      // Send notifications for each config (fire-and-forget)
      const notificationPromises = relevantConfigs.map((config) =>
        this.sendNotification(config, payload),
      );

      // Wait for all notifications, but don't throw on errors
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      // Catch all errors - notifications must not crash the worker
      console.error(
        `[notifications] Error sending notifications for execution ${executionId}:`,
        error,
      );
    }
  }

  /**
   * Send a single notification based on config.
   * @param config - Notification configuration
   * @param payload - Notification payload
   */
  private async sendNotification(
    config: {
      type: string;
      config: unknown;
    },
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const configObj = config.config as Record<string, unknown>;

      if (config.type === 'email') {
        // Email notification
        const to = configObj.to;
        if (!to || typeof to !== 'string') {
          console.error(
            `[notifications] Email config missing 'to' field, skipping`,
          );
          return;
        }

        // Send email with plain JSON payload as body
        await this.emailExecutor.execute(
          {
            to,
            subject: `Workflow Execution ${payload.status === 'failed' ? 'Failed' : 'Paused'}`,
            body: JSON.stringify(payload, null, 2),
          },
          {}, // Empty context - no templating needed
        );
      } else if (config.type === 'webhook') {
        // Webhook notification
        const url = configObj.url;
        if (!url || typeof url !== 'string') {
          console.error(
            `[notifications] Webhook config missing 'url' field, skipping`,
          );
          return;
        }

        // Send HTTP POST with JSON payload
        await this.httpExecutor.execute(
          {
            method: 'POST',
            url,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
          {}, // Empty context - no templating needed
        );
      } else {
        console.error(
          `[notifications] Unknown notification type: ${config.type}, skipping`,
        );
      }
    } catch (error) {
      // Catch individual notification errors - don't fail other notifications
      console.error(
        `[notifications] Error sending ${config.type} notification:`,
        error,
      );
    }
  }
}
