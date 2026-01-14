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

/**
 * Retry configuration for step execution.
 * Can be specified in step config under _retry key.
 */
export interface StepRetryConfig {
  /**
   * Maximum number of retry attempts (default: 3).
   * Total attempts = maxRetries + 1 (initial attempt + retries).
   */
  maxRetries?: number;
  /**
   * Initial delay in milliseconds before first retry (default: 1000).
   * Subsequent retries use exponential backoff: initialDelay * 2^attemptNumber.
   */
  initialDelay?: number;
}
