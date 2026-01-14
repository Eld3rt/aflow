/**
 * Notification payload structure.
 * Plain JSON object with workflow execution failure/pause information.
 */
export interface NotificationPayload {
  workflowId: string;
  executionId: string;
  failedStep: {
    order: number;
    type: string;
  } | null;
  errorMessage: string | null;
  status: 'failed' | 'paused';
  pausedAt?: string; // ISO string, only for paused status
  resumeAt?: string; // ISO string, only for paused status with resumeAt
}

/**
 * Build notification payload from execution data.
 * @param workflowId - Workflow ID
 * @param executionId - Execution ID
 * @param status - Execution status (failed or paused)
 * @param currentStepOrder - Current step order (failed step)
 * @param errorMessage - Error message
 * @param pausedAt - Pause timestamp (optional)
 * @param resumeAt - Resume timestamp (optional)
 * @param steps - All workflow steps (to find failed step type)
 * @returns Notification payload
 */
export function buildNotificationPayload(
  workflowId: string,
  executionId: string,
  status: 'failed' | 'paused',
  currentStepOrder: number | null,
  errorMessage: string | null,
  pausedAt?: Date | null,
  resumeAt?: Date | null,
  steps?: Array<{ order: number; type: string }>,
): NotificationPayload {
  // Find failed step if currentStepOrder is set
  let failedStep: { order: number; type: string } | null = null;
  if (currentStepOrder !== null && steps) {
    const step = steps.find((s) => s.order === currentStepOrder);
    if (step) {
      failedStep = {
        order: step.order,
        type: step.type,
      };
    }
  }

  const payload: NotificationPayload = {
    workflowId,
    executionId,
    failedStep,
    errorMessage,
    status,
  };

  // Add pause-specific fields
  if (status === 'paused') {
    if (pausedAt) {
      payload.pausedAt = pausedAt.toISOString();
    }
    if (resumeAt) {
      payload.resumeAt = resumeAt.toISOString();
    }
  }

  return payload;
}
