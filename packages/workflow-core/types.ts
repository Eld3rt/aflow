/**
 * Execution context that accumulates data as workflow steps execute.
 * Initial context comes from trigger payload, and each step's output
 * is merged into this context.
 */
export type ExecutionContext = Record<string, unknown>;

/**
 * Result of executing a single step.
 */
export interface StepExecutionResult {
  output: Record<string, unknown>;
}

/**
 * Result of executing an entire workflow.
 */
export interface WorkflowExecutionResult {
  success: boolean;
  context: ExecutionContext;
  error?: string;
}
