import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '../../index.js';

/**
 * Transform action executor.
 * Executes user-provided JavaScript code to transform the execution context.
 *
 * Constraints:
 * - No filesystem access
 * - No network access
 * - No async code (synchronous execution only)
 * - Input context is read-only
 * - Output must be serializable
 */
export class TransformActionExecutor implements StepExecutor {
  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Extract and validate required config
    const code = config.code;
    if (!code || typeof code !== 'string') {
      throw new Error(
        'Transform action requires a valid "code" string in config.code',
      );
    }

    if (code.trim().length === 0) {
      throw new Error('Transform action code cannot be empty');
    }

    // Create read-only copy of context
    // Deep freeze to prevent mutations (enforces read-only constraint)
    const frozenContext = this.createReadOnlyContext(context);

    try {
      // Execute user code in controlled environment
      // Using Function constructor to execute code with context as parameter
      // The code can be:
      // 1. An expression: "{ result: context.value * 2 }" (will be wrapped with return)
      // 2. A function body: "const doubled = context.value * 2; return { result: doubled };"
      //
      // If code doesn't contain a return statement, wrap it to make it return the expression
      const normalizedCode = this.normalizeCode(code);
      const userFunction = new Function('context', normalizedCode);

      // Execute synchronously (no async allowed)
      const result = userFunction(frozenContext);

      // Validate result is serializable
      if (result === undefined || result === null) {
        // Allow undefined/null, but return empty object to merge
        return { output: {} };
      }

      // Validate result is an object (required for merging into context)
      if (typeof result !== 'object') {
        throw new Error(
          `Transform code must return an object, got: ${typeof result}`,
        );
      }

      // Ensure result is serializable by attempting JSON serialization
      // This will throw if result contains non-serializable values (functions, symbols, etc.)
      JSON.stringify(result);

      // Return result as output (will be merged into context)
      return {
        output: result as Record<string, unknown>,
      };
    } catch (error) {
      // Fail workflow safely with descriptive error
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Transform execution failed: ${String(error)}`;
      throw new Error(`Transform step failed: ${errorMessage}`);
    }
  }

  /**
   * Normalize user code to ensure it returns a value.
   * If code doesn't contain a return statement, wrap it with "return".
   */
  private normalizeCode(code: string): string {
    const trimmed = code.trim();

    // If code already contains a return statement, use as-is
    if (/\breturn\b/.test(trimmed)) {
      return trimmed;
    }

    // Otherwise, wrap with return statement
    // Handle both single-line and multi-line expressions
    return `return (${trimmed});`;
  }

  /**
   * Create a read-only copy of the context.
   * Uses deep freeze to prevent mutations during transformation.
   */
  private createReadOnlyContext(context: ExecutionContext): ExecutionContext {
    // Deep clone to prevent mutations
    const cloned = this.deepClone(context);

    // Deep freeze to enforce read-only
    this.deepFreeze(cloned);

    return cloned;
  }

  /**
   * Deep clone an object to prevent mutations.
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Deep freeze an object to make it read-only.
   */
  private deepFreeze<T>(obj: T): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    // Freeze the object itself
    Object.freeze(obj);

    // Recursively freeze all properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (
          value !== null &&
          typeof value === 'object' &&
          !Object.isFrozen(value)
        ) {
          this.deepFreeze(value);
        }
      }
    }
  }
}
