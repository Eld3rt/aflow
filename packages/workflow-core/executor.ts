import { prisma } from '@aflow/db';
import type { ExecutionContext, WorkflowExecutionResult } from './types.js';
import { stepExecutorRegistry } from './step-executor.js';

/**
 * Workflow execution engine.
 * Loads workflow from database and executes steps sequentially.
 */
export class WorkflowExecutor {
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

        // Execute step with current context
        const result = await executor.execute(stepConfig, context);

        // Accumulate step output into context
        Object.assign(context, result.output);
      }

      return {
        success: true,
        context,
      };
    } catch (error) {
      // Fail fast on any error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        context,
        error: errorMessage,
      };
    }
  }
}
