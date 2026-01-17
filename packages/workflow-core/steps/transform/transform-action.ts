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
 * - Text: toUpperCase, toLowerCase, trim, replace, length, capitalize
 * - Number: formatNumber, formatPhoneNumber, performMathOperation, randomNumber
 * - Date: formatDate, addOrSubtractTime
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

      case 'length':
        return str.length;

      case 'capitalize': {
        return str
          .split(/\s+/)
          .map((word) => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      }

      default:
        throw new Error(
          `Unsupported text operation: ${operation}. Supported: toUpperCase, toLowerCase, trim, replace, length, capitalize`,
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
      case 'formatNumber': {
        if (input === null || input === undefined) {
          throw new Error(
            'Number formatNumber operation input cannot be null or undefined',
          );
        }

        const inputDecimalMark = config.inputDecimalMark as string | undefined;
        if (!inputDecimalMark || (inputDecimalMark !== 'Comma' && inputDecimalMark !== 'Period')) {
          throw new Error(
            'Number formatNumber operation requires "inputDecimalMark" field as "Comma" or "Period"',
          );
        }

        const toFormat = config.toFormat as string | undefined;
        const validFormats = [
          'Comma for grouping & period for decimal',
          'Period for grouping & comma for decimal',
          'Space for grouping & period for decimal',
          'Space for grouping & comma for decimal',
        ];
        if (!toFormat || !validFormats.includes(toFormat)) {
          throw new Error(
            `Number formatNumber operation requires "toFormat" field as one of: ${validFormats.join(', ')}`,
          );
        }

        return this.formatNumber(
          String(input),
          inputDecimalMark,
          toFormat,
        );
      }

      case 'formatPhoneNumber': {
        if (input === null || input === undefined) {
          throw new Error(
            'Number formatPhoneNumber operation input cannot be null or undefined',
          );
        }

        const toFormat = config.toFormat as string | undefined;
        const validFormats = [
          '+15558001212',
          '+1 555-800-1212',
          '(555) 800-1212',
          '+1-555-800-1212',
          '555-800-1212',
          '+1 555 800 1212',
          '555 800-1212',
          '5558001212',
          '15558001212',
        ];
        if (!toFormat || !validFormats.includes(toFormat)) {
          throw new Error(
            `Number formatPhoneNumber operation requires "toFormat" field as one of: ${validFormats.join(', ')}`,
          );
        }

        return this.formatPhoneNumber(String(input), toFormat);
      }

      case 'performMathOperation': {
        if (input === null || input === undefined) {
          throw new Error(
            'Number performMathOperation operation input cannot be null or undefined',
          );
        }

        const mathOperation = config.operation as string | undefined;
        const validOperations = ['Add', 'Subtract', 'Multiply', 'Divide', 'Make Negative'];
        if (!mathOperation || !validOperations.includes(mathOperation)) {
          throw new Error(
            `Number performMathOperation requires "operation" field as one of: ${validOperations.join(', ')}`,
          );
        }

        const num = Number(input);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot convert "${input}" to number`);
        }

        return this.performMathOperation(num, mathOperation, config);
      }

      case 'randomNumber': {
        const lowerRange = config.lowerRange as number | undefined;
        const upperRange = config.upperRange as number | undefined;

        if (lowerRange === undefined || typeof lowerRange !== 'number') {
          throw new Error(
            'Number randomNumber operation requires "lowerRange" field as number',
          );
        }

        if (upperRange === undefined || typeof upperRange !== 'number') {
          throw new Error(
            'Number randomNumber operation requires "upperRange" field as number',
          );
        }

        if (lowerRange > upperRange) {
          throw new Error(
            'Number randomNumber operation: lowerRange must be less than or equal to upperRange',
          );
        }

        const decimalPoints = (config.decimalPoints as number | undefined) ?? 0;
        if (typeof decimalPoints !== 'number' || decimalPoints < 0 || decimalPoints > 3) {
          throw new Error(
            'Number randomNumber operation requires "decimalPoints" field as number between 0 and 3',
          );
        }

        return this.generateRandomNumber(lowerRange, upperRange, decimalPoints);
      }

      default:
        throw new Error(
          `Unsupported number operation: ${operation}. Supported: formatNumber, formatPhoneNumber, performMathOperation, randomNumber`,
        );
    }
  }

  /**
   * Format a number string with different decimal marks and grouping separators.
   */
  private formatNumber(
    input: string,
    inputDecimalMark: string,
    toFormat: string,
  ): string {
    // Check for negative sign
    const isNegative = input.trim().startsWith('-');
    
    // Normalize input: remove all non-digit characters except the decimal mark
    const inputDecimalChar = inputDecimalMark === 'Comma' ? ',' : '.';
    const normalizedInput = input.replace(
      new RegExp(`[^0-9${inputDecimalChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'),
      '',
    );

    // Split into integer and decimal parts
    const parts = normalizedInput.split(inputDecimalChar);
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';

    // Determine output format
    let groupingChar: string;
    let decimalChar: string;

    if (toFormat === 'Comma for grouping & period for decimal') {
      groupingChar = ',';
      decimalChar = '.';
    } else if (toFormat === 'Period for grouping & comma for decimal') {
      groupingChar = '.';
      decimalChar = ',';
    } else if (toFormat === 'Space for grouping & period for decimal') {
      groupingChar = ' ';
      decimalChar = '.';
    } else {
      // Space for grouping & comma for decimal
      groupingChar = ' ';
      decimalChar = ',';
    }

    // Add grouping separators to integer part (every 3 digits from right)
    let formattedInteger = '';
    let count = 0;
    for (let i = integerPart.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) {
        formattedInteger = groupingChar + formattedInteger;
      }
      formattedInteger = integerPart[i] + formattedInteger;
      count++;
    }

    // Combine with decimal part if present
    let result = formattedInteger;
    if (decimalPart) {
      result = formattedInteger + decimalChar + decimalPart;
    }

    // Add negative sign if needed
    if (isNegative && result !== '0') {
      result = '-' + result;
    }

    return result;
  }

  /**
   * Format a phone number string to various formats.
   */
  private formatPhoneNumber(input: string, toFormat: string): string {
    // Extract digits only from input
    const digits = input.replace(/\D/g, '');

    // Determine if we have country code (starts with 1 for US/Canada)
    let countryCode = '';
    let nationalNumber = '';

    if (digits.length >= 10) {
      // Check if first digit is 1 (US/Canada country code)
      if (digits.length === 11 && digits[0] === '1') {
        countryCode = '1';
        nationalNumber = digits.substring(1);
      } else if (digits.length === 10) {
        nationalNumber = digits;
      } else if (digits.length === 11) {
        // Assume it's international format with country code
        const firstChar = digits[0];
        if (firstChar) {
          countryCode = firstChar;
          nationalNumber = digits.substring(1);
        } else {
          nationalNumber = digits;
        }
      } else {
        // Use all digits as national number
        nationalNumber = digits;
      }
    } else {
      nationalNumber = digits;
    }

    // Format: +15558001212 (E164)
    if (toFormat === '+15558001212') {
      return countryCode ? `+${countryCode}${nationalNumber}` : `+${nationalNumber}`;
    }

    // Format: +1 555-800-1212 (International)
    if (toFormat === '+1 555-800-1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `+1 ${area}-${exchange}-${number}`;
      }
      return countryCode ? `+${countryCode} ${nationalNumber}` : `+${nationalNumber}`;
    }

    // Format: (555) 800-1212 (National)
    if (toFormat === '(555) 800-1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `(${area}) ${exchange}-${number}`;
      }
      return nationalNumber;
    }

    // Format: +1-555-800-1212 (RFC3966)
    if (toFormat === '+1-555-800-1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `+1-${area}-${exchange}-${number}`;
      }
      return countryCode ? `+${countryCode}-${nationalNumber}` : `+${nationalNumber}`;
    }

    // Format: 555-800-1212 (International, No Country Code)
    if (toFormat === '555-800-1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `${area}-${exchange}-${number}`;
      }
      return nationalNumber;
    }

    // Format: +1 555 800 1212 (International, No Hyphens)
    if (toFormat === '+1 555 800 1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `+1 ${area} ${exchange} ${number}`;
      }
      return countryCode ? `+${countryCode} ${nationalNumber}` : `+${nationalNumber}`;
    }

    // Format: 555 800-1212 (National, No Parenthesis)
    if (toFormat === '555 800-1212') {
      if (nationalNumber.length >= 10) {
        const area = nationalNumber.substring(0, 3);
        const exchange = nationalNumber.substring(3, 6);
        const number = nationalNumber.substring(6, 10);
        return `${area} ${exchange}-${number}`;
      }
      return nationalNumber;
    }

    // Format: 5558001212 (No Symbols, National)
    if (toFormat === '5558001212') {
      return nationalNumber;
    }

    // Format: 15558001212 (No Symbols, International)
    if (toFormat === '15558001212') {
      return countryCode ? `${countryCode}${nationalNumber}` : nationalNumber;
    }

    return nationalNumber;
  }

  /**
   * Perform mathematical operations on a number.
   */
  private performMathOperation(
    num: number,
    operation: string,
    config: Record<string, unknown>,
  ): number {
    switch (operation) {
      case 'Add': {
        const operand = config.operand as number | undefined;
        if (operand === undefined || typeof operand !== 'number') {
          throw new Error(
            'Number performMathOperation Add requires "operand" field as number',
          );
        }
        return num + operand;
      }

      case 'Subtract': {
        const operand = config.operand as number | undefined;
        if (operand === undefined || typeof operand !== 'number') {
          throw new Error(
            'Number performMathOperation Subtract requires "operand" field as number',
          );
        }
        return num - operand;
      }

      case 'Multiply': {
        const operand = config.operand as number | undefined;
        if (operand === undefined || typeof operand !== 'number') {
          throw new Error(
            'Number performMathOperation Multiply requires "operand" field as number',
          );
        }
        return num * operand;
      }

      case 'Divide': {
        const operand = config.operand as number | undefined;
        if (operand === undefined || typeof operand !== 'number') {
          throw new Error(
            'Number performMathOperation Divide requires "operand" field as number',
          );
        }
        if (operand === 0) {
          throw new Error('Number performMathOperation Divide: cannot divide by zero');
        }
        return num / operand;
      }

      case 'Make Negative': {
        return -num;
      }

      default:
        throw new Error(`Unsupported math operation: ${operation}`);
    }
  }

  /**
   * Generate a random number within a range with specified decimal points.
   */
  private generateRandomNumber(
    lowerRange: number,
    upperRange: number,
    decimalPoints: number,
  ): number {
    const random = Math.random() * (upperRange - lowerRange) + lowerRange;
    const multiplier = Math.pow(10, decimalPoints);
    return Math.round(random * multiplier) / multiplier;
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

      case 'addOrSubtractTime': {
        if (input === null || input === undefined) {
          throw new Error(
            'Date addOrSubtractTime operation input cannot be null or undefined',
          );
        }
        const date = new Date(String(input));
        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot parse "${input}" as date`);
        }
        const expression = config.expression as string | undefined;
        if (!expression || typeof expression !== 'string') {
          throw new Error(
            'Date addOrSubtractTime operation requires "expression" field as string (e.g., "+8 hours 1 minute", "+1 month -2 days")',
          );
        }

        const result = new Date(date);
        this.applyTimeExpression(result, expression);
        return result.toISOString();
      }

      default:
        throw new Error(
          `Unsupported date operation: ${operation}. Supported: formatDate, addOrSubtractTime`,
        );
    }
  }

  /**
   * Parse and apply a time expression to a date.
   * Supports expressions like: "+8 hours 1 minute", "+1 month -2 days", "-1 day +8 hours"
   * Time units: seconds, minutes, hours, days, weeks, months, years
   */
  private applyTimeExpression(date: Date, expression: string): void {
    // Regex to match: optional sign, number, time unit
    // Matches: "+8 hours", "-2 days", "1 minute" (implicit +)
    const timeUnitPattern =
      /([+-]?)\s*(\d+)\s+(second|minute|hour|day|week|month|year)s?\b/gi;

    let match: RegExpExecArray | null;
    let hasMatch = false;

    while ((match = timeUnitPattern.exec(expression)) !== null) {
      hasMatch = true;
      const sign = match[1] || '+'; // Default to + if no sign
      const valueStr = match[2];
      const unitStr = match[3];

      if (!valueStr || !unitStr) {
        throw new Error(
          `Invalid time expression format: "${expression}". Each time unit must have a number and unit name.`,
        );
      }

      const value = parseInt(valueStr, 10);
      const unit = unitStr.toLowerCase();

      // Determine the actual amount (positive or negative)
      const amount = sign === '-' ? -value : value;

      // Apply the time adjustment based on unit
      switch (unit) {
        case 'second':
          date.setSeconds(date.getSeconds() + amount);
          break;
        case 'minute':
          date.setMinutes(date.getMinutes() + amount);
          break;
        case 'hour':
          date.setHours(date.getHours() + amount);
          break;
        case 'day':
          date.setDate(date.getDate() + amount);
          break;
        case 'week':
          date.setDate(date.getDate() + amount * 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() + amount);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() + amount);
          break;
        default:
          throw new Error(
            `Unsupported time unit: ${unit}. Supported: seconds, minutes, hours, days, weeks, months, years`,
          );
      }
    }

    if (!hasMatch) {
      throw new Error(
        `Invalid time expression: "${expression}". Expected format: "+8 hours 1 minute", "+1 month -2 days", etc.`,
      );
    }
  }
}
