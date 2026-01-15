import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '../../index.js';

/**
 * Transform action executor.
 * Declarative formatter for basic data types (text, numbers, dates).
 * Safe, rule-based transformations with no dynamic code execution.
 *
 * Supported types:
 * - Text: toUpperCase, toLowerCase, trim, replace, substring, concat, length
 * - Number: toNumber, round, ceil, floor, fixedDecimals, min, max
 * - Date: parseDate, formatDate, addDays, addHours, toUnix, fromUnix
 */
export class TransformActionExecutor implements StepExecutor {
  async execute(
    config: Record<string, unknown>,
    _context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Validate required config fields
    if (!config.type || typeof config.type !== 'string') {
      throw new Error(
        'Transform action requires "type" field (text, number, or date)',
      );
    }

    if (!config.operation || typeof config.operation !== 'string') {
      throw new Error(
        'Transform action requires "operation" field (e.g., "toUpperCase", "round", "formatDate")',
      );
    }

    const type = config.type as string;
    const operation = config.operation as string;
    const input = config.input;
    const format = config.format as string | undefined;

    // Route to appropriate formatter based on type
    let result: unknown;
    try {
      switch (type) {
        case 'text':
          result = this.executeTextOperation(operation, input, config);
          break;
        case 'number':
          result = this.executeNumberOperation(operation, input, config);
          break;
        case 'date':
          result = this.executeDateOperation(operation, input, format, config);
          break;
        default:
          throw new Error(
            `Unsupported transform type: ${type}. Must be one of: text, number, date`,
          );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Transform operation failed: ${String(error)}`;
      throw new Error(`Transform step failed: ${errorMessage}`);
    }

    // Ensure result is serializable
    try {
      JSON.stringify(result);
    } catch {
      throw new Error(
        'Transform operation returned non-serializable result. Result must be JSON-serializable.',
      );
    }

    // Return result as output (will be merged into context)
    // Wrap single values in an object with 'result' key for consistency
    return {
      output:
        result !== null && typeof result === 'object' && !Array.isArray(result)
          ? (result as Record<string, unknown>)
          : { result },
    };
  }

  /**
   * Execute text formatting operations.
   */
  private executeTextOperation(
    operation: string,
    input: unknown,
    config: Record<string, unknown>,
  ): unknown {
    if (input === null || input === undefined) {
      throw new Error('Text operation input cannot be null or undefined');
    }

    const str = String(input);

    switch (operation) {
      case 'toUpperCase':
        return str.toUpperCase();

      case 'toLowerCase':
        return str.toLowerCase();

      case 'trim':
        return str.trim();

      case 'replace': {
        const search = config.search as string | undefined;
        const replace = (config.replace as string | undefined) ?? '';
        if (!search) {
          throw new Error('Text replace operation requires "search" field');
        }
        return str.replace(search, replace);
      }

      case 'substring': {
        const start = config.start as number | undefined;
        const end = config.end as number | undefined;
        if (start === undefined) {
          throw new Error('Text substring operation requires "start" field');
        }
        if (end !== undefined) {
          return str.substring(start, end);
        }
        return str.substring(start);
      }

      case 'concat': {
        const values = config.values as unknown[] | undefined;
        if (!Array.isArray(values)) {
          throw new Error(
            'Text concat operation requires "values" field as an array',
          );
        }
        return str + values.map((v) => String(v)).join('');
      }

      case 'length':
        return str.length;

      default:
        throw new Error(
          `Unsupported text operation: ${operation}. Supported: toUpperCase, toLowerCase, trim, replace, substring, concat, length`,
        );
    }
  }

  /**
   * Execute number formatting operations.
   */
  private executeNumberOperation(
    operation: string,
    input: unknown,
    config: Record<string, unknown>,
  ): unknown {
    switch (operation) {
      case 'toNumber': {
        if (input === null || input === undefined) {
          throw new Error(
            'Number toNumber operation input cannot be null or undefined',
          );
        }
        const num = Number(input);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }
        return num;
      }

      case 'round':
      case 'ceil':
      case 'floor': {
        if (input === null || input === undefined) {
          throw new Error(
            `Number ${operation} operation input cannot be null or undefined`,
          );
        }
        const num = Number(input);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }
        switch (operation) {
          case 'round':
            return Math.round(num);
          case 'ceil':
            return Math.ceil(num);
          case 'floor':
            return Math.floor(num);
        }
      }

      case 'fixedDecimals': {
        if (input === null || input === undefined) {
          throw new Error(
            'Number fixedDecimals operation input cannot be null or undefined',
          );
        }
        const num = Number(input);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }
        const decimals = (config.decimals as number | undefined) ?? 2;
        if (typeof decimals !== 'number' || decimals < 0) {
          throw new Error(
            'Number fixedDecimals operation requires "decimals" as non-negative number',
          );
        }
        return Number(num.toFixed(decimals));
      }

      case 'min':
      case 'max': {
        if (input === null || input === undefined) {
          throw new Error(
            `Number ${operation} operation input cannot be null or undefined`,
          );
        }
        const num = Number(input);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }
        const limit = config.limit as number | undefined;
        if (limit === undefined || typeof limit !== 'number') {
          throw new Error(
            `Number ${operation} operation requires "limit" as number`,
          );
        }
        return operation === 'min'
          ? Math.max(num, limit)
          : Math.min(num, limit);
      }

      default:
        throw new Error(
          `Unsupported number operation: ${operation}. Supported: toNumber, round, ceil, floor, fixedDecimals, min, max`,
        );
    }
  }

  /**
   * Execute date formatting operations.
   */
  private executeDateOperation(
    operation: string,
    input: unknown,
    format: string | undefined,
    config: Record<string, unknown>,
  ): unknown {
    switch (operation) {
      case 'parseDate': {
        if (input === null || input === undefined) {
          throw new Error(
            'Date parseDate operation input cannot be null or undefined',
          );
        }
        const date = new Date(String(input));
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${input}" as date`);
        }
        return date.toISOString();
      }

      case 'formatDate': {
        if (input === null || input === undefined) {
          throw new Error(
            'Date formatDate operation input cannot be null or undefined',
          );
        }
        const date = new Date(String(input));
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${input}" as date`);
        }
        if (!format) {
          throw new Error('Date formatDate operation requires "format" field');
        }

        // Support common formats
        if (format === 'ISO') {
          return date.toISOString();
        }
        if (format === 'RFC3339') {
          return date.toISOString();
        }

        // Custom format support (simplified)
        // YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, etc.
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
      }

      case 'addDays':
      case 'addHours': {
        if (input === null || input === undefined) {
          throw new Error(
            `Date ${operation} operation input cannot be null or undefined`,
          );
        }
        const date = new Date(String(input));
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${input}" as date`);
        }
        const amount = config.amount as number | undefined;
        if (amount === undefined || typeof amount !== 'number') {
          throw new Error(
            `Date ${operation} operation requires "amount" as number`,
          );
        }

        const result = new Date(date);
        if (operation === 'addDays') {
          result.setDate(result.getDate() + amount);
        } else {
          result.setHours(result.getHours() + amount);
        }
        return result.toISOString();
      }

      case 'toUnix': {
        if (input === null || input === undefined) {
          throw new Error(
            'Date toUnix operation input cannot be null or undefined',
          );
        }
        const date = new Date(String(input));
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${input}" as date`);
        }
        return Math.floor(date.getTime() / 1000);
      }

      case 'fromUnix': {
        if (input === null || input === undefined) {
          throw new Error(
            'Date fromUnix operation input cannot be null or undefined',
          );
        }
        const timestamp = Number(input);
        if (Number.isNaN(timestamp)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }
        const date = new Date(timestamp * 1000);
        return date.toISOString();
      }

      default:
        throw new Error(
          `Unsupported date operation: ${operation}. Supported: parseDate, formatDate, addDays, addHours, toUnix, fromUnix`,
        );
    }
  }
}
