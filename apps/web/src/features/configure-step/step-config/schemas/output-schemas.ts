/**
 * Frontend-side output schemas for triggers and actions.
 * User-centric schemas exposing only fields that non-technical users would reuse.
 * These schemas prioritize usability over technical accuracy - they show what users
 * need, not necessarily what the backend outputs.
 * Used to populate the Available Data panel in configuration forms.
 */

export type FieldSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  children?: Record<string, FieldSchema>;
};

export type StepOutputSchema = {
  stepName: string;
  stepType: string;
  fields: Record<string, FieldSchema>;
};

/**
 * Get output schema for a trigger type.
 */
export function getTriggerOutputSchema(triggerType: string): StepOutputSchema | null {
  switch (triggerType) {
    case 'webhook':
      return {
        stepName: 'Trigger',
        stepType: 'webhook',
        fields: {
          // Webhook triggers receive POST body directly as flat object
          // Exact fields depend on incoming payload, but we show common examples
          body: {
            name: 'body',
            type: 'object',
            description: 'Request body from webhook POST',
          },
        },
      };

    case 'email':
      return {
        stepName: 'Trigger',
        stepType: 'email',
        fields: {
          from: {
            name: 'from',
            type: 'string',
            description: 'Sender email address',
          },
          subject: {
            name: 'subject',
            type: 'string',
            description: 'Email subject',
          },
          body: {
            name: 'body',
            type: 'string',
            description: 'Email body/content',
          },
        },
      };

    case 'cron':
    case 'schedule':
      return {
        stepName: 'Trigger',
        stepType: 'cron',
        fields: {
          triggeredAt: {
            name: 'triggeredAt',
            type: 'string',
            description: 'Timestamp when trigger fired',
          },
        },
      };

    default:
      return null;
  }
}

/**
 * Get output schema for an action type.
 */
export function getActionOutputSchema(actionType: string): StepOutputSchema | null {
  switch (actionType) {
    case 'http':
      return {
        stepName: 'HTTP Action',
        stepType: 'http',
        fields: {
          // User-centric: only expose the response body
          // Backend outputs httpResponse, but users think of it as "body"
          body: {
            name: 'body',
            type: 'object',
            description: 'Response body from HTTP request',
          },
        },
      };

    case 'email':
      return {
        stepName: 'Email Action',
        stepType: 'email',
        fields: {
          to: {
            name: 'to',
            type: 'string',
            description: 'Recipient email addresses',
          },
          subject: {
            name: 'subject',
            type: 'string',
            description: 'Email subject',
          },
          body: {
            name: 'body',
            type: 'string',
            description: 'Email body content',
          },
        },
      };

    case 'telegram':
      return {
        stepName: 'Telegram Action',
        stepType: 'telegram',
        fields: {
          chatId: {
            name: 'chatId',
            type: 'number',
            description: 'Telegram chat ID',
          },
          message: {
            name: 'message',
            type: 'string',
            description: 'Sent message content',
          },
        },
      };

    case 'database':
      return {
        stepName: 'Database Action',
        stepType: 'database',
        fields: {
          // User-centric: expose as "result" not "databaseResult"
          // Backend outputs databaseResult, but users think of it as "result"
          result: {
            name: 'result',
            type: 'object',
            description: 'Database query result',
          },
        },
      };

    case 'transform':
      return {
        stepName: 'Data Formatter',
        stepType: 'transform',
        fields: {
          result: {
            name: 'result',
            type: 'string',
            description: 'Formatter output result',
          },
        },
      };

    default:
      return null;
  }
}

/**
 * Convert a schema to a flat list of field paths.
 * Returns paths like: ['field', 'nested.field', 'array[0].subfield']
 */
export function flattenSchemaToPaths(
  schema: StepOutputSchema,
  prefix = '',
): string[] {
  const paths: string[] = [];

  function traverse(
    fields: Record<string, FieldSchema>,
    currentPrefix: string,
  ) {
    for (const [key, field] of Object.entries(fields)) {
      const fullPath = currentPrefix ? `${currentPrefix}.${key}` : key;
      paths.push(fullPath);

      if (field.children) {
        traverse(field.children, fullPath);
      }
    }
  }

  traverse(schema.fields, prefix);
  return paths;
}
