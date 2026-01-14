import { prisma, type InputJsonValue } from '@aflow/db';
import type {
  ErrorPolicyConfig,
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
   * @param executionId - Optional execution ID for resuming a paused execution
   * @returns Execution result with final context
   */
  async execute(
    workflowId: string,
    triggerPayload?: Record<string, unknown>,
    executionId?: string,
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

    // Load persisted execution state if resuming
    let execution = executionId
      ? await prisma.workflowExecution.findUnique({
          where: { id: executionId },
        })
      : null;

    if (executionId && !execution) {
      return {
        success: false,
        context: triggerPayload || {},
        error: `Execution not found: ${executionId}`,
      };
    }

    // Initialize execution context from persisted state or trigger payload
    let context: ExecutionContext;
    let startStepOrder: number;

    if (execution) {
      // Resume from existing execution (paused or other state)
      context = (execution.context as ExecutionContext) || {};
      startStepOrder = execution.currentStepOrder ?? 0;
    } else {
      // New execution
      context = triggerPayload ? { ...triggerPayload } : {};
      startStepOrder = 0;
    }

    // Create or update execution record
    if (!execution) {
      execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          status: 'running',
          currentStepOrder: 0,
          context: context as InputJsonValue,
        },
      });
    } else {
      // Update existing execution to running
      execution = await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'running',
          pausedAt: null,
          resumeAt: null,
          error: null,
        },
      });
    }

    try {
      // Execute steps sequentially starting from currentStepOrder
      const stepsToExecute = workflow.steps.filter(
        (step) => step.order >= startStepOrder,
      );

      for (const step of stepsToExecute) {
        const executor = stepExecutorRegistry.get(step.type);
        const stepConfig = (step.config as Record<string, unknown>) || {};

        // Extract retry config from step config (if present)
        const retryConfig = this.getRetryConfig(stepConfig);

        // Extract error policy from step config (if present)
        const errorPolicy = this.getErrorPolicy(stepConfig);

        try {
          // Execute step with retry logic
          const result = await this.executeStepWithRetry(
            executor,
            stepConfig,
            context,
            retryConfig,
          );

          // Accumulate step output into context
          Object.assign(context, result.output);

          // Persist execution state after successful step
          const nextStepOrder = step.order + 1;
          const isLastStep = nextStepOrder >= workflow.steps.length;

          execution = await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              currentStepOrder: isLastStep ? null : nextStepOrder,
              context: context as InputJsonValue,
            },
          });
        } catch (error) {
          // Step failed after all retries - check error policy
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (errorPolicy.mode === 'pause' || errorPolicy.mode === 'pauseUntil') {
            // Pause execution
            const resumeAt = errorPolicy.mode === 'pauseUntil' && errorPolicy.resumeAt
              ? new Date(errorPolicy.resumeAt)
              : null;

            await prisma.workflowExecution.update({
              where: { id: execution.id },
              data: {
                status: 'paused',
                currentStepOrder: step.order, // Next step to execute is this failed step
                context: context as InputJsonValue,
                pausedAt: new Date(),
                resumeAt,
                error: errorMessage,
              },
            });

            return {
              success: false,
              context,
              error: errorMessage,
              paused: true,
              executionId: execution.id,
              resumeAt: resumeAt?.toISOString(),
            };
          }

          // Default: fail execution
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'failed',
              currentStepOrder: step.order,
              context: context as InputJsonValue,
              error: errorMessage,
            },
          });

          throw error;
        }
      }

      // All steps completed successfully
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          currentStepOrder: null,
          context: context as InputJsonValue,
        },
      });

      return {
        success: true,
        context,
      };
    } catch (error) {
      // On failure, ensure execution state is persisted
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Only update if not already updated (paused or failed)
      if (execution.status === 'running') {
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            error: errorMessage,
          },
        });
      }

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
   * Extract error policy configuration from step config.
   * Error policy can be specified under _errorPolicy key in step config.
   * @param stepConfig - Step configuration
   * @returns Error policy configuration with defaults applied
   */
  private getErrorPolicy(stepConfig: Record<string, unknown>): ErrorPolicyConfig {
    const errorPolicyRaw = stepConfig._errorPolicy;

    // Default: fail on error
    if (!errorPolicyRaw) {
      return { mode: 'fail' };
    }

    // If it's a string, treat as mode
    if (typeof errorPolicyRaw === 'string') {
      if (errorPolicyRaw === 'pause' || errorPolicyRaw === 'pauseUntil') {
        return { mode: errorPolicyRaw };
      }
      return { mode: 'fail' };
    }

    // If it's an object, parse as ErrorPolicyConfig
    if (typeof errorPolicyRaw === 'object') {
      const errorPolicy = errorPolicyRaw as Partial<ErrorPolicyConfig>;
      const mode = errorPolicy.mode || 'fail';

      if (mode === 'pauseUntil') {
        if (!errorPolicy.resumeAt || typeof errorPolicy.resumeAt !== 'string') {
          // Invalid pauseUntil config - default to fail
          return { mode: 'fail' };
        }
        return {
          mode: 'pauseUntil',
          resumeAt: errorPolicy.resumeAt,
        };
      }

      if (mode === 'pause') {
        return { mode: 'pause' };
      }

      return { mode: 'fail' };
    }

    return { mode: 'fail' };
  }

  /**
   * Sleep for specified milliseconds.
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
