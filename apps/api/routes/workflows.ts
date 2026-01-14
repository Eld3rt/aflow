import { Router } from 'express';
import { prisma, type InputJsonValue } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';
import {
  validateCreateWorkflowRequest,
  validateUpdateWorkflowRequest,
} from '../validators/workflows.js';
import type { WorkflowResponse } from '../types/workflows.js';

const router = Router();

function toWorkflowResponse(workflow: {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  trigger: {
    id: string;
    type: string;
    config: unknown;
    createdAt: Date;
  } | null;
  steps: Array<{
    id: string;
    type: string;
    config: unknown;
    order: number;
    createdAt: Date;
  }>;
}): WorkflowResponse {
  return {
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    trigger: workflow.trigger
      ? {
          id: workflow.trigger.id,
          type: workflow.trigger.type,
          config: workflow.trigger.config as Record<string, unknown>,
          createdAt: workflow.trigger.createdAt.toISOString(),
        }
      : null,
    steps: workflow.steps
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        type: step.type,
        config: step.config as Record<string, unknown>,
        order: step.order,
        createdAt: step.createdAt.toISOString(),
      })),
  };
}

// POST /workflows
router.post('/', async (req, res) => {
  const validation = validateCreateWorkflowRequest(req.body);
  if (validation.valid === false) {
    return res.status(400).json({ error: validation.error });
  }

  const { name, status, trigger, steps } = validation.data;

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      // Create workflow
      const createdWorkflow = await tx.workflow.create({
        data: {
          name,
          status,
        },
      });

      // Create trigger if provided
      if (trigger) {
        await tx.trigger.create({
          data: {
            type: trigger.type,
            config: trigger.config as InputJsonValue,
            workflowId: createdWorkflow.id,
          },
        });
      }

      // Create steps
      if (steps.length > 0) {
        await tx.step.createMany({
          data: steps.map((step) => ({
            type: step.type,
            config: step.config as InputJsonValue,
            order: step.order,
            workflowId: createdWorkflow.id,
          })),
        });
      }

      // Fetch complete workflow with relations
      return await tx.workflow.findUniqueOrThrow({
        where: { id: createdWorkflow.id },
        include: {
          trigger: true,
          steps: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    res.status(201).json(toWorkflowResponse(workflow));
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /workflows
router.get('/', async (_req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        trigger: true,
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(200).json(workflows.map(toWorkflowResponse));
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /workflows/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        trigger: true,
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.status(200).json(toWorkflowResponse(workflow));
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /workflows/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  const validation = validateUpdateWorkflowRequest(req.body);
  if (validation.valid === false) {
    return res.status(400).json({ error: validation.error });
  }

  const { name, status, trigger, steps } = validation.data;

  try {
    // Check if workflow exists
    const existing = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = await prisma.$transaction(async (tx) => {
      // Update workflow
      await tx.workflow.update({
        where: { id },
        data: {
          name,
          status,
        },
      });

      // Delete existing trigger and steps (cascade will handle, but explicit for clarity)
      await tx.trigger.deleteMany({
        where: { workflowId: id },
      });
      await tx.step.deleteMany({
        where: { workflowId: id },
      });

      // Create new trigger if provided
      if (trigger) {
        await tx.trigger.create({
          data: {
            type: trigger.type,
            config: trigger.config as InputJsonValue,
            workflowId: id,
          },
        });
      }

      // Create new steps
      if (steps.length > 0) {
        await tx.step.createMany({
          data: steps.map((step) => ({
            type: step.type,
            config: step.config as InputJsonValue,
            order: step.order,
            workflowId: id,
          })),
        });
      }

      // Fetch complete workflow with relations
      return await tx.workflow.findUniqueOrThrow({
        where: { id },
        include: {
          trigger: true,
          steps: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    res.status(200).json(toWorkflowResponse(workflow));
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /workflows/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Cascade delete will handle trigger and steps
    await prisma.workflow.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /workflows/:id/executions
router.get('/:id/executions', async (req, res) => {
  const { id } = req.params;

  try {
    // Verify workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Fetch executions for this workflow
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(
      executions.map((execution) => ({
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        currentStepOrder: execution.currentStepOrder,
        pausedAt: execution.pausedAt?.toISOString() || null,
        resumeAt: execution.resumeAt?.toISOString() || null,
        error: execution.error,
        createdAt: execution.createdAt.toISOString(),
        updatedAt: execution.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /workflows/:id/executions/:executionId
router.get('/:id/executions/:executionId', async (req, res) => {
  const { id, executionId } = req.params;

  try {
    // Verify workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Fetch execution
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Verify execution belongs to workflow
    if (execution.workflowId !== id) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.status(200).json({
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      currentStepOrder: execution.currentStepOrder,
      context: execution.context,
      pausedAt: execution.pausedAt?.toISOString() || null,
      resumeAt: execution.resumeAt?.toISOString() || null,
      error: execution.error,
      createdAt: execution.createdAt.toISOString(),
      updatedAt: execution.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /workflows/:id/executions/:executionId/resume
router.post('/:id/executions/:executionId/resume', async (req, res) => {
  const { id, executionId } = req.params;

  try {
    // Verify workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Fetch execution
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Verify execution belongs to workflow
    if (execution.workflowId !== id) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Verify execution is paused
    if (execution.status !== 'paused') {
      return res.status(400).json({
        error: `Execution is not paused (current status: ${execution.status})`,
      });
    }

    // Check if it's a delayed retry (pauseUntil) and resumeAt is in the future
    if (execution.resumeAt && execution.resumeAt > new Date()) {
      return res.status(400).json({
        error: `Execution is scheduled to resume at ${execution.resumeAt.toISOString()}`,
        resumeAt: execution.resumeAt.toISOString(),
      });
    }

    // Enqueue job to resume execution
    // For delayed retry, calculate delay if resumeAt is set
    const now = new Date();
    const resumeAt = execution.resumeAt;
    const delay =
      resumeAt && resumeAt > now ? resumeAt.getTime() - now.getTime() : 0;

    await workflowExecutionQueue.add(
      'workflow-execution',
      {
        workflowId: id,
        executionId: executionId,
        triggerPayload: {}, // Context is loaded from persisted execution
      },
      {
        delay, // BullMQ delay in milliseconds
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    res.status(200).json({
      success: true,
      message: 'Execution resume enqueued',
      executionId: executionId,
      delay: delay > 0 ? delay : 0,
    });
  } catch (error) {
    console.error('Error resuming execution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /workflows/:id/executions/:executionId/logs
router.get('/:id/executions/:executionId/logs', async (req, res) => {
  const { id, executionId } = req.params;

  try {
    // Verify workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Fetch execution
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Verify execution belongs to workflow
    if (execution.workflowId !== id) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Fetch logs for this execution, ordered by timestamp
    const logs = await prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
    });

    res.status(200).json(
      logs.map((log) => ({
        id: log.id,
        executionId: log.executionId,
        stepId: log.stepId,
        stepOrder: log.stepOrder,
        eventType: log.eventType,
        timestamp: log.timestamp.toISOString(),
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as workflowsRouter };
