import type { ExecutionContext } from './types.js';

/**
 * Template a string by replacing {{key}} placeholders with values from context.
 * Supports nested object access using dot notation (e.g., {{user.name}}).
 *
 * @param template - String template with {{key}} placeholders
 * @param context - Execution context containing values to substitute
 * @returns Templated string with placeholders replaced
 */
export function templateString(
  template: string,
  context: ExecutionContext,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = getNestedValue(context, trimmedKey);
    if (value === undefined || value === null) {
      return match;
    }
    // Convert value to string representation
    // For objects and arrays, use JSON.stringify for proper serialization
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    // For primitives (string, number, boolean), use String()
    return String(value);
  });
}

/**
 * Get nested value from object using dot notation.
 * @param obj - Object to traverse
 * @param path - Dot-separated path (e.g., "user.name")
 * @returns Value at path or undefined
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
