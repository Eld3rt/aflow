import type { ExecutionContext, StepExecutionResult } from './types.js';

/**
 * Interface for step executors.
 * Each step type should have an executor that implements this interface.
 */
export interface StepExecutor {
  /**
   * Execute a step with the given config and current execution context.
   * @param config - Step configuration from database
   * @param context - Current execution context (accumulated from previous steps)
   * @returns Step execution result with output to merge into context
   */
  execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult>;
}

/**
 * Registry of step executors by step type.
 * Mock implementations for MVP - returns config values as output.
 */
class StepExecutorRegistry {
  private executors = new Map<string, StepExecutor>();

  /**
   * Register a step executor for a given step type.
   */
  register(type: string, executor: StepExecutor): void {
    this.executors.set(type, executor);
  }

  /**
   * Get executor for a step type.
   * Returns a mock executor if none is registered.
   */
  get(type: string): StepExecutor {
    const executor = this.executors.get(type);
    if (executor) {
      return executor;
    }

    // Default mock executor: echo config as output
    return {
      execute: async (config, context) => {
        // Mock implementation: return config values as output
        // In real implementation, this would call actual integrations
        return {
          output: {
            ...config,
            _executed: true,
            _contextKeys: Object.keys(context),
          },
        };
      },
    };
  }
}

/**
 * Global step executor registry instance.
 */
export const stepExecutorRegistry = new StepExecutorRegistry();
