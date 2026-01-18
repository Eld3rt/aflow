import { Router } from 'express';
import { prisma, type InputJsonValue } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';
import {
  validateCreateWorkflowRequest,
  validateUpdateWorkflowRequest,
} from '../validators/workflows.js';
import type { WorkflowResponse } from '../types/workflows.js';
import type { AuthenticatedRequest } from '../utils/auth.js';
import { createSchedulerJob, removeSchedulerJob } from '@aflow/queue';

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

/**
 * @swagger
 * /workflows:
 *   post:
 *     summary: Create a new workflow
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWorkflowRequest'
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const validation = validateCreateWorkflowRequest(req.body);
  if (validation.valid === false) {
    return res.status(400).json({ error: validation.error });
  }

  const { name, status, trigger, steps } = validation.data;
  const userId = req.userId!; // Set by auth middleware

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      // Create workflow
      const createdWorkflow = await tx.workflow.create({
        data: {
          name,
          status,
          userId,
        },
      });

      // Create trigger if provided
      if (trigger) {
        const triggerData: {
          id?: string;
          type: string;
          config: InputJsonValue;
          workflowId: string;
        } = {
          type: trigger.type,
          config: trigger.config as InputJsonValue,
          workflowId: createdWorkflow.id,
        };

        // If trigger ID is provided, use it; otherwise let Prisma auto-generate
        if (trigger.id) {
          triggerData.id = trigger.id;
        }

        await tx.trigger.create({
          data: triggerData,
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

    // Handle scheduler job lifecycle
    // If workflow is active and has cron trigger, create scheduler job
    if (workflow.status === 'active' && workflow.trigger?.type === 'cron') {
      await createSchedulerJob(workflow.id).catch((error) => {
        // Log but don't fail the request if scheduler job creation fails
        console.error(
          `[workflows] Failed to create scheduler job for workflow ${workflow.id}:`,
          error,
        );
      });
    }

    res.status(201).json(toWorkflowResponse(workflow));
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /workflows:
 *   get:
 *     summary: List all workflows
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: List of workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkflowResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!; // Set by auth middleware

  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
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

/**
 * @swagger
 * /workflows/statistics:
 *   get:
 *     summary: Get global statistics across all workflows
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: Global statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GlobalStatistics'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/statistics', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!; // Set by auth middleware

  try {
    // Get all workflows for user
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      select: { id: true },
    });

    const workflowIds = workflows.map((w) => w.id);

    // Get all executions for user's workflows
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: { in: workflowIds } },
      select: { status: true },
    });

    // Calculate global statistics
    const totalExecutions = executions.length;
    const successCount = executions.filter(
      (e) => e.status === 'completed',
    ).length;
    const failureCount = executions.filter((e) => e.status === 'failed').length;
    const pausedCount = executions.filter((e) => e.status === 'paused').length;

    res.status(200).json({
      totalWorkflows: workflows.length,
      totalExecutions,
      successCount,
      failureCount,
      pausedCount,
    });
  } catch (error) {
    console.error('Error fetching global statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /workflows/{id}:
 *   get:
 *     summary: Get a specific workflow by ID
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }
  const userId = req.userId!; // Set by auth middleware

  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId },
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

/**
 * @swagger
 * /workflows/{id}:
 *   put:
 *     summary: Update an existing workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWorkflowRequest'
 *     responses:
 *       200:
 *         description: Workflow updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }
  const userId = req.userId!; // Set by auth middleware

  const validation = validateUpdateWorkflowRequest(req.body);
  if (validation.valid === false) {
    return res.status(400).json({ error: validation.error });
  }

  const { name, status, trigger, steps } = validation.data;

  try {
    // Check if workflow exists and belongs to user, including trigger for scheduler logic
    const existing = await prisma.workflow.findFirst({
      where: { id, userId },
      include: {
        trigger: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Track previous state for scheduler job lifecycle
    const wasActiveWithCron =
      existing.status === 'active' && existing.trigger?.type === 'cron';

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
        const triggerData: {
          id?: string;
          type: string;
          config: InputJsonValue;
          workflowId: string;
        } = {
          type: trigger.type,
          config: trigger.config as InputJsonValue,
          workflowId: id,
        };

        // If trigger ID is provided, use it; otherwise let Prisma auto-generate
        if (trigger.id) {
          triggerData.id = trigger.id;
        }

        await tx.trigger.create({
          data: triggerData,
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

    // Handle scheduler job lifecycle based on state changes
    const isActiveWithCron =
      workflow.status === 'active' && workflow.trigger?.type === 'cron';

    if (wasActiveWithCron && !isActiveWithCron) {
      // Workflow was active with cron, but now it's not - remove scheduler job
      await removeSchedulerJob(id).catch((error) => {
        console.error(
          `[workflows] Failed to remove scheduler job for workflow ${id}:`,
          error,
        );
      });
    } else if (!wasActiveWithCron && isActiveWithCron) {
      // Workflow became active with cron - create scheduler job
      await createSchedulerJob(id).catch((error) => {
        console.error(
          `[workflows] Failed to create scheduler job for workflow ${id}:`,
          error,
        );
      });
    } else if (wasActiveWithCron && isActiveWithCron) {
      // Workflow was and still is active with cron - update job if cron expression changed
      const oldCronExpression = (
        existing.trigger?.config as Record<string, unknown>
      )?.cronExpression;
      const newCronExpression = (
        workflow.trigger?.config as Record<string, unknown>
      )?.cronExpression;
      if (oldCronExpression !== newCronExpression) {
        // Cron expression changed - remove old and create new
        await removeSchedulerJob(id).catch((error) => {
          console.error(
            `[workflows] Failed to remove scheduler job for workflow ${id}:`,
            error,
          );
        });
        await createSchedulerJob(id).catch((error) => {
          console.error(
            `[workflows] Failed to create scheduler job for workflow ${id}:`,
            error,
          );
        });
      }
    }

    res.status(200).json(toWorkflowResponse(workflow));
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /workflows/{id}:
 *   delete:
 *     summary: Delete a workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteWorkflowResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }
  const userId = req.userId!; // Set by auth middleware

  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId },
      include: {
        trigger: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if workflow had an active cron trigger before deletion
    const hadActiveCron =
      workflow.status === 'active' && workflow.trigger?.type === 'cron';

    // Cascade delete will handle trigger and steps
    await prisma.workflow.delete({
      where: { id },
    });

    // Remove scheduler job if workflow had an active cron trigger
    if (hadActiveCron) {
      await removeSchedulerJob(id).catch((error) => {
        console.error(
          `[workflows] Failed to remove scheduler job for deleted workflow ${id}:`,
          error,
        );
      });
    }

    res.status(200).json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /workflows/{id}/executions:
 *   get:
 *     summary: List all executions for a workflow
 *     tags: [Executions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: List of executions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExecutionListItem'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/executions', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }
  const userId = req.userId!; // Set by auth middleware

  try {
    // Verify workflow exists and belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId },
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

/**
 * @swagger
 * /workflows/{id}/executions/{executionId}:
 *   get:
 *     summary: Get execution details
 *     tags: [Executions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Execution ID
 *     responses:
 *       200:
 *         description: Execution details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExecutionDetail'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow or execution not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/executions/:executionId',
  async (req: AuthenticatedRequest, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const executionId = Array.isArray(req.params.executionId)
      ? req.params.executionId[0]
      : req.params.executionId;
    if (!id || !executionId) {
      return res
        .status(400)
        .json({ error: 'Workflow ID and Execution ID are required' });
    }
    const userId = req.userId!; // Set by auth middleware

    try {
      // Verify workflow exists and belongs to user
      const workflow = await prisma.workflow.findFirst({
        where: { id, userId },
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

      // Calculate duration
      // For paused executions, use pausedAt if available, otherwise updatedAt
      // For completed/failed, use updatedAt
      const endTime =
        execution.status === 'paused' && execution.pausedAt
          ? execution.pausedAt
          : execution.updatedAt;
      const durationMs = endTime.getTime() - execution.createdAt.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);

      // Count unique steps executed (from logs)
      const logs = await prisma.executionLog.findMany({
        where: { executionId },
        select: { stepId: true },
      });
      const uniqueStepIds = new Set(logs.map((log) => log.stepId));
      const stepsCount = uniqueStepIds.size;

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
        // Summary fields
        duration: durationSeconds, // Duration in seconds
        stepsCount: stepsCount,
        failureReason: execution.error || null,
      });
    } catch (error) {
      console.error('Error fetching execution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * @swagger
 * /workflows/{id}/executions/{executionId}/resume:
 *   post:
 *     summary: Resume a paused execution
 *     tags: [Executions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Execution ID
 *     responses:
 *       200:
 *         description: Execution resume enqueued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResumeExecutionResponse'
 *       400:
 *         description: Execution is not paused or scheduled for future
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow or execution not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/executions/:executionId/resume',
  async (req: AuthenticatedRequest, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const executionId = Array.isArray(req.params.executionId)
      ? req.params.executionId[0]
      : req.params.executionId;
    if (!id || !executionId) {
      return res
        .status(400)
        .json({ error: 'Workflow ID and Execution ID are required' });
    }
    const userId = req.userId!; // Set by auth middleware

    try {
      // Verify workflow exists and belongs to user
      const workflow = await prisma.workflow.findFirst({
        where: { id, userId },
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
  },
);

/**
 * @swagger
 * /workflows/{id}/executions/{executionId}/logs:
 *   get:
 *     summary: Get execution logs
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Execution ID
 *     responses:
 *       200:
 *         description: List of execution logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExecutionLog'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow or execution not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/executions/:executionId/logs',
  async (req: AuthenticatedRequest, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const executionId = Array.isArray(req.params.executionId)
      ? req.params.executionId[0]
      : req.params.executionId;
    if (!id || !executionId) {
      return res
        .status(400)
        .json({ error: 'Workflow ID and Execution ID are required' });
    }
    const userId = req.userId!; // Set by auth middleware

    try {
      // Verify workflow exists and belongs to user
      const workflow = await prisma.workflow.findFirst({
        where: { id, userId },
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
  },
);

/**
 * @swagger
 * /workflows/{id}/statistics:
 *   get:
 *     summary: Get statistics for a specific workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowStatistics'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/statistics', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'Workflow ID is required' });
  }
  const userId = req.userId!; // Set by auth middleware

  try {
    // Verify workflow exists and belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Fetch all executions for this workflow
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: id },
      select: { status: true },
    });

    // Calculate statistics
    const totalExecutions = executions.length;
    const successCount = executions.filter(
      (e) => e.status === 'completed',
    ).length;
    const failureCount = executions.filter((e) => e.status === 'failed').length;
    const pausedCount = executions.filter((e) => e.status === 'paused').length;

    res.status(200).json({
      workflowId: id,
      totalExecutions,
      successCount,
      failureCount,
      pausedCount,
    });
  } catch (error) {
    console.error('Error fetching workflow statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as workflowsRouter };
