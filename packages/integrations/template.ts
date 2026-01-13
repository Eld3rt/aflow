import type { ExecutionContext } from '@aflow/workflow-core';

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
    return value !== undefined && value !== null ? String(value) : match;
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
