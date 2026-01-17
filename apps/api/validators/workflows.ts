import type { CreateWorkflowRequest } from '../types/workflows.js';

export function validateCreateWorkflowRequest(
  body: unknown,
):
  | { valid: true; data: CreateWorkflowRequest }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const obj = body as Record<string, unknown>;

  // Validate workflow.name
  if (
    !obj.name ||
    typeof obj.name !== 'string' ||
    obj.name.trim().length === 0
  ) {
    return {
      valid: false,
      error: 'Workflow name is required and must be a non-empty string',
    };
  }

  // Validate workflow.status
  if (
    !obj.status ||
    typeof obj.status !== 'string' ||
    obj.status.trim().length === 0
  ) {
    return {
      valid: false,
      error: 'Workflow status is required and must be a non-empty string',
    };
  }

  // Validate trigger (optional)
  if (obj.trigger !== undefined) {
    if (!obj.trigger || typeof obj.trigger !== 'object') {
      return { valid: false, error: 'Trigger must be an object if provided' };
    }
    const trigger = obj.trigger as Record<string, unknown>;
    
    // Validate optional trigger ID
    if (trigger.id !== undefined) {
      if (typeof trigger.id !== 'string' || trigger.id.trim().length === 0) {
        return {
          valid: false,
          error: 'Trigger ID must be a non-empty string if provided',
        };
      }
    }
    
    if (
      !trigger.type ||
      typeof trigger.type !== 'string' ||
      trigger.type.trim().length === 0
    ) {
      return {
        valid: false,
        error: 'Trigger type is required and must be a non-empty string',
      };
    }
    if (
      !trigger.config ||
      typeof trigger.config !== 'object' ||
      Array.isArray(trigger.config)
    ) {
      return {
        valid: false,
        error: 'Trigger config is required and must be an object',
      };
    }
  }

  // Validate steps (required)
  if (!Array.isArray(obj.steps)) {
    return { valid: false, error: 'Steps is required and must be an array' };
  }

  if (obj.steps.length === 0) {
    return { valid: false, error: 'Steps array cannot be empty' };
  }

  const stepOrders = new Set<number>();
  for (let i = 0; i < obj.steps.length; i++) {
    const step = obj.steps[i];
    if (!step || typeof step !== 'object') {
      return { valid: false, error: `Step at index ${i} must be an object` };
    }

    const stepObj = step as Record<string, unknown>;

    if (
      !stepObj.type ||
      typeof stepObj.type !== 'string' ||
      stepObj.type.trim().length === 0
    ) {
      return {
        valid: false,
        error: `Step at index ${i} must have a non-empty type string`,
      };
    }

    if (
      !stepObj.config ||
      typeof stepObj.config !== 'object' ||
      Array.isArray(stepObj.config)
    ) {
      return {
        valid: false,
        error: `Step at index ${i} must have a config object`,
      };
    }

    if (
      typeof stepObj.order !== 'number' ||
      !Number.isInteger(stepObj.order) ||
      stepObj.order < 0
    ) {
      return {
        valid: false,
        error: `Step at index ${i} must have an order that is a non-negative integer`,
      };
    }

    if (stepOrders.has(stepObj.order)) {
      return {
        valid: false,
        error: `Step at index ${i} has duplicate order ${stepObj.order}`,
      };
    }
    stepOrders.add(stepObj.order);
  }

  return {
    valid: true,
    data: {
      name: obj.name as string,
      status: obj.status as string,
      trigger: obj.trigger
        ? {
            id: (obj.trigger as Record<string, unknown>).id as
              | string
              | undefined,
            type: (obj.trigger as Record<string, unknown>).type as string,
            config: (obj.trigger as Record<string, unknown>).config as Record<
              string,
              unknown
            >,
          }
        : undefined,
      steps: obj.steps.map((step) => ({
        type: (step as Record<string, unknown>).type as string,
        config: (step as Record<string, unknown>).config as Record<
          string,
          unknown
        >,
        order: (step as Record<string, unknown>).order as number,
      })),
    },
  };
}

export function validateUpdateWorkflowRequest(
  body: unknown,
):
  | { valid: true; data: CreateWorkflowRequest }
  | { valid: false; error: string } {
  // Update uses the same validation as create
  return validateCreateWorkflowRequest(body);
}
