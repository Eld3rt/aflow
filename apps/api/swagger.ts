import swaggerJsdoc, { type Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AFlow API',
      version: '1.0.0',
      description: 'REST API for AFlow workflow automation platform',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
          required: ['error'],
        },
        WorkflowStatus: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Workflow status',
        },
        ExecutionStatus: {
          type: 'string',
          enum: ['running', 'paused', 'failed', 'completed'],
          description: 'Execution status',
        },
        LogEventType: {
          type: 'string',
          enum: ['started', 'completed', 'failed', 'paused', 'retried'],
          description: 'Log event type',
        },
        TriggerType: {
          type: 'string',
          enum: ['cron', 'email', 'webhook'],
          description: 'Trigger type',
        },
        TriggerConfig: {
          type: 'object',
          description: 'Trigger configuration (varies by trigger type)',
          additionalProperties: true,
        },
        Trigger: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Trigger ID (optional, auto-generated if not provided)',
            },
            type: {
              $ref: '#/components/schemas/TriggerType',
            },
            config: {
              $ref: '#/components/schemas/TriggerConfig',
            },
          },
          required: ['type', 'config'],
        },
        StepConfig: {
          type: 'object',
          description: 'Step configuration (varies by step type)',
          additionalProperties: true,
        },
        Step: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Step type',
            },
            config: {
              $ref: '#/components/schemas/StepConfig',
            },
            order: {
              type: 'integer',
              minimum: 0,
              description: 'Step execution order',
            },
          },
          required: ['type', 'config', 'order'],
        },
        CreateWorkflowRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Workflow name',
            },
            status: {
              $ref: '#/components/schemas/WorkflowStatus',
            },
            trigger: {
              $ref: '#/components/schemas/Trigger',
              nullable: true,
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Step',
              },
              minItems: 1,
              description: 'Workflow steps (must not be empty)',
            },
          },
          required: ['name', 'status', 'steps'],
        },
        UpdateWorkflowRequest: {
          $ref: '#/components/schemas/CreateWorkflowRequest',
        },
        TriggerResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              $ref: '#/components/schemas/TriggerType',
            },
            config: {
              $ref: '#/components/schemas/TriggerConfig',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'type', 'config', 'createdAt'],
        },
        StepResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
            },
            config: {
              $ref: '#/components/schemas/StepConfig',
            },
            order: {
              type: 'integer',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'type', 'config', 'order', 'createdAt'],
        },
        WorkflowResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            status: {
              $ref: '#/components/schemas/WorkflowStatus',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            trigger: {
              oneOf: [
                {
                  $ref: '#/components/schemas/TriggerResponse',
                },
                {
                  type: 'null',
                },
              ],
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/StepResponse',
              },
            },
          },
          required: [
            'id',
            'name',
            'status',
            'createdAt',
            'updatedAt',
            'trigger',
            'steps',
          ],
        },
        ExecutionListItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              $ref: '#/components/schemas/ExecutionStatus',
            },
            currentStepOrder: {
              type: 'integer',
              nullable: true,
              description: 'Pointer to next step to execute (null if completed)',
            },
            pausedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            resumeAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'For delayed retry (timestamp-based pause)',
            },
            error: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: [
            'id',
            'workflowId',
            'status',
            'currentStepOrder',
            'pausedAt',
            'resumeAt',
            'error',
            'createdAt',
            'updatedAt',
          ],
        },
        ExecutionDetail: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              $ref: '#/components/schemas/ExecutionStatus',
            },
            currentStepOrder: {
              type: 'integer',
              nullable: true,
            },
            context: {
              type: 'object',
              description: 'Accumulated execution context',
              additionalProperties: true,
            },
            pausedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            resumeAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            error: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            duration: {
              type: 'integer',
              description: 'Duration in seconds',
            },
            stepsCount: {
              type: 'integer',
              description: 'Number of unique steps executed',
            },
            failureReason: {
              type: 'string',
              nullable: true,
            },
          },
          required: [
            'id',
            'workflowId',
            'status',
            'currentStepOrder',
            'context',
            'pausedAt',
            'resumeAt',
            'error',
            'createdAt',
            'updatedAt',
            'duration',
            'stepsCount',
            'failureReason',
          ],
        },
        ResumeExecutionResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            executionId: {
              type: 'string',
              format: 'uuid',
            },
            delay: {
              type: 'integer',
              description: 'Delay in milliseconds (if scheduled for future)',
            },
          },
          required: ['success', 'message', 'executionId', 'delay'],
        },
        ExecutionLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            executionId: {
              type: 'string',
              format: 'uuid',
            },
            stepId: {
              type: 'string',
            },
            stepOrder: {
              type: 'integer',
            },
            eventType: {
              $ref: '#/components/schemas/LogEventType',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            metadata: {
              type: 'object',
              nullable: true,
              description: 'Optional metadata (e.g., error, retryCount)',
              additionalProperties: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: [
            'id',
            'executionId',
            'stepId',
            'stepOrder',
            'eventType',
            'timestamp',
            'metadata',
            'createdAt',
          ],
        },
        WorkflowStatistics: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              format: 'uuid',
            },
            totalExecutions: {
              type: 'integer',
            },
            successCount: {
              type: 'integer',
            },
            failureCount: {
              type: 'integer',
            },
            pausedCount: {
              type: 'integer',
            },
          },
          required: [
            'workflowId',
            'totalExecutions',
            'successCount',
            'failureCount',
            'pausedCount',
          ],
        },
        GlobalStatistics: {
          type: 'object',
          properties: {
            totalWorkflows: {
              type: 'integer',
            },
            totalExecutions: {
              type: 'integer',
            },
            successCount: {
              type: 'integer',
            },
            failureCount: {
              type: 'integer',
            },
            pausedCount: {
              type: 'integer',
            },
          },
          required: [
            'totalWorkflows',
            'totalExecutions',
            'successCount',
            'failureCount',
            'pausedCount',
          ],
        },
        WebhookEmailPayload: {
          type: 'object',
          description: 'Email webhook payload (provider-agnostic, varies by provider)',
          additionalProperties: true,
        },
        WebhookEmailResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            workflowsTriggered: {
              type: 'integer',
              nullable: true,
            },
            email: {
              type: 'object',
              properties: {
                from: {
                  type: 'string',
                },
                subject: {
                  type: 'string',
                },
              },
              required: ['from', 'subject'],
            },
          },
          required: ['success', 'message', 'email'],
        },
        WebhookGenericPayload: {
          type: 'object',
          description: 'Generic webhook payload (any JSON object)',
          additionalProperties: true,
        },
        WebhookGenericResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            workflowId: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['success', 'message', 'workflowId'],
        },
        DeleteWorkflowResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
          required: ['message'],
        },
      },
    },
  },
  apis: ['./routes/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
