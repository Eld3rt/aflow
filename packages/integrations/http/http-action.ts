import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '@aflow/workflow-core';
import { templateString } from '../template.js';

/**
 * HTTP action executor.
 * Supports GET and POST requests with configurable URL, method, headers, and body.
 * Body can be templated from execution context.
 */
export class HttpActionExecutor implements StepExecutor {
  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Extract and validate required config
    const url = config.url;
    if (!url || typeof url !== 'string') {
      throw new Error('HTTP action requires a valid URL in config.url');
    }

    const method = (config.method as string) || 'GET';
    if (method !== 'GET' && method !== 'POST') {
      throw new Error(`HTTP action method must be GET or POST, got: ${method}`);
    }

    // Extract headers (optional)
    const headersConfig = config.headers;
    const headers: Record<string, string> = {};
    if (headersConfig && typeof headersConfig === 'object') {
      for (const [key, value] of Object.entries(headersConfig)) {
        if (typeof value === 'string') {
          headers[key] = templateString(value, context);
        }
      }
    }

    // Set default Content-Type for POST requests
    if (method === 'POST' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Extract and template body (optional, only for POST)
    let body: string | undefined;
    if (method === 'POST' && config.body !== undefined) {
      const bodyConfig = config.body;
      if (typeof bodyConfig === 'string') {
        // Template the body string
        body = templateString(bodyConfig, context);
      } else if (typeof bodyConfig === 'object') {
        // If body is an object, template any string values within it
        body = JSON.stringify(templateObject(bodyConfig, context));
      } else {
        body = String(bodyConfig);
      }
    }

    // Execute HTTP request
    const response = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body,
    });

    // Check if request was successful
    if (!response.ok) {
      throw new Error(
        `HTTP request failed: ${response.status} ${response.statusText}`,
      );
    }

    // Parse JSON response
    let responseData: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      // For non-JSON responses, return as text
      responseData = await response.text();
    }

    // Return response data in output (will be merged into context)
    return {
      output: {
        httpResponse: responseData,
        status: response.status,
        statusText: response.statusText,
      },
    };
  }
}

/**
 * Recursively template string values in an object.
 */
function templateObject(obj: unknown, context: ExecutionContext): unknown {
  if (typeof obj === 'string') {
    return templateString(obj, context);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => templateObject(item, context));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = templateObject(value, context);
    }
    return result;
  }
  return obj;
}
