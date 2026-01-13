import { Router } from 'express';
import type * as runtime from '@prisma/client/runtime/client';
import { prisma } from '../prisma/prisma.js';
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
            config: trigger.config as runtime.InputJsonValue,
            workflowId: createdWorkflow.id,
          },
        });
      }

      // Create steps
      if (steps.length > 0) {
        await tx.step.createMany({
          data: steps.map((step) => ({
            type: step.type,
            config: step.config as runtime.InputJsonValue,
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
            config: trigger.config as runtime.InputJsonValue,
            workflowId: id,
          },
        });
      }

      // Create new steps
      if (steps.length > 0) {
        await tx.step.createMany({
          data: steps.map((step) => ({
            type: step.type,
            config: step.config as runtime.InputJsonValue,
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

export { router as workflowsRouter };
