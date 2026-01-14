import { prisma } from '@aflow/db';
import type {
  ExecutionContext,
  StepRetryConfig,
  WorkflowExecutionResult,
} from './types.js';
import { stepExecutorRegistry } from './step-executor.js';

/**
 * Workflow execution engine.
 * Loads workflow from database and executes steps sequentially with retry logic.
 */
export class WorkflowExecutor {
  /**
   * Default retry configuration.
   */
  private readonly defaultRetryConfig: Required<StepRetryConfig> = {
    maxRetries: 3,
    initialDelay: 1000,
  };

  /**
   * Execute a workflow by ID.
   * @param workflowId - ID of workflow to execute
   * @param triggerPayload - Initial context data from trigger (optional)
   * @returns Execution result with final context
   */
  async execute(
    workflowId: string,
    triggerPayload?: Record<string, unknown>,
  ): Promise<WorkflowExecutionResult> {
    // Load workflow with trigger and steps from database
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        trigger: true,
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      return {
        success: false,
        context: triggerPayload || {},
        error: `Workflow not found: ${workflowId}`,
      };
    }

    // Initialize execution context from trigger payload
    const context: ExecutionContext = triggerPayload
      ? { ...triggerPayload }
      : {};

    try {
      // Execute steps sequentially by order
      for (const step of workflow.steps) {
        const executor = stepExecutorRegistry.get(step.type);
        const stepConfig = (step.config as Record<string, unknown>) || {};

        // Extract retry config from step config (if present)
        const retryConfig = this.getRetryConfig(stepConfig);

        // Execute step with retry logic
        const result = await this.executeStepWithRetry(
          executor,
          stepConfig,
          context,
          retryConfig,
        );

        // Accumulate step output into context
        Object.assign(context, result.output);
      }

      return {
        success: true,
        context,
      };
    } catch (error) {
      // On repeated failure, mark workflow as failed and stop execution
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        context,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a step with retry logic and exponential backoff.
   * @param executor - Step executor to use
   * @param stepConfig - Step configuration
   * @param context - Current execution context
   * @param retryConfig - Retry configuration
   * @returns Step execution result
   * @throws Error if step fails after all retries
   */
  private async executeStepWithRetry(
    executor: import('./step-executor.js').StepExecutor,
    stepConfig: Record<string, unknown>,
    context: ExecutionContext,
    retryConfig: Required<StepRetryConfig>,
  ): Promise<import('./types.js').StepExecutionResult> {
    let lastError: Error | unknown;
    const maxAttempts = retryConfig.maxRetries + 1; // Initial attempt + retries

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Execute step (idempotent - reads config and context, returns output)
        return await executor.execute(stepConfig, context);
      } catch (error) {
        lastError = error;

        // If this was the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Step failed after ${maxAttempts} attempts: ${errorMessage}`,
          );
        }

        // Calculate exponential backoff delay: initialDelay * 2^attemptNumber
        const delay = retryConfig.initialDelay * Math.pow(2, attempt);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError;
  }

  /**
   * Extract retry configuration from step config.
   * Retry config can be specified under _retry key in step config.
   * @param stepConfig - Step configuration
   * @returns Retry configuration with defaults applied
   */
  private getRetryConfig(
    stepConfig: Record<string, unknown>,
  ): Required<StepRetryConfig> {
    const retryConfigRaw = stepConfig._retry;
    if (!retryConfigRaw || typeof retryConfigRaw !== 'object') {
      return this.defaultRetryConfig;
    }

    const retryConfig = retryConfigRaw as Partial<StepRetryConfig>;
    return {
      maxRetries:
        retryConfig.maxRetries !== undefined
          ? retryConfig.maxRetries
          : this.defaultRetryConfig.maxRetries,
      initialDelay:
        retryConfig.initialDelay !== undefined
          ? retryConfig.initialDelay
          : this.defaultRetryConfig.initialDelay,
    };
  }

  /**
   * Sleep for specified milliseconds.
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
