import { prisma, type InputJsonValue } from '@aflow/db';

/**
 * Execution log event types.
 */
export type ExecutionLogEventType =
  | 'started'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'retried';

/**
 * Metadata for execution log entries.
 */
export interface ExecutionLogMetadata {
  error?: string;
  retryCount?: number;
}

/**
 * Log a step execution event.
 * Immutable append-only logging - creates a new log entry.
 * @param executionId - Execution ID
 * @param stepId - Step ID
 * @param stepOrder - Step order
 * @param eventType - Event type
 * @param metadata - Optional metadata (error, retryCount)
 */
export async function logStepEvent(
  executionId: string,
  stepId: string,
  stepOrder: number,
  eventType: ExecutionLogEventType,
  metadata?: ExecutionLogMetadata,
): Promise<void> {
  try {
    await prisma.executionLog.create({
      data: {
        executionId,
        stepId,
        stepOrder,
        eventType,
        timestamp: new Date(),
        metadata: metadata ? (metadata as InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    // Log errors should not crash execution
    // Log to console as fallback
    console.error(
      `[execution-logger] Failed to log ${eventType} event for step ${stepId}:`,
      error,
    );
  }
}
