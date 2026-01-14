import { Router } from 'express';
import { prisma } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';
import {
  normalizeEmailPayload,
  type NormalizedEmailPayload,
} from '../utils/email.js';

const router = Router();

/**
 * POST /webhooks/email
 * Generic email webhook endpoint (provider-agnostic).
 * Normalizes email payload and triggers all active workflows with email triggers.
 */
router.post('/email', async (req, res) => {
  try {
    // Normalize email payload from any provider format
    const normalizedEmail: NormalizedEmailPayload = normalizeEmailPayload(
      req.body,
    );

    // Find all active workflows with email triggers
    const workflows = await prisma.workflow.findMany({
      where: {
        status: 'active',
        trigger: {
          type: 'email',
        },
      },
      include: {
        trigger: true,
      },
    });

    // Enqueue workflow execution jobs for each matching workflow
    // Retry configuration: minimal retries at job level since step-level retries handle transient failures
    const enqueuePromises = workflows.map((workflow) =>
      workflowExecutionQueue.add(
        'workflow-execution',
        {
          workflowId: workflow.id,
          triggerPayload: { ...normalizedEmail },
        },
        {
          // Job-level retry as safety net for catastrophic failures
          // Step-level retries (in WorkflowExecutor) handle transient step failures
          attempts: 2, // 1 initial attempt + 1 retry
          backoff: {
            type: 'exponential',
            delay: 2000, // 2 seconds initial delay
          },
        },
      ),
    );

    await Promise.all(enqueuePromises);

    // Return success response immediately (workflows execute in background)
    res.status(200).json({
      success: true,
      message: 'Email webhook received and workflow executions enqueued',
      workflowsTriggered: workflows.length,
      email: {
        from: normalizedEmail.from,
        subject: normalizedEmail.subject,
      },
    });
  } catch (error) {
    console.error('Error processing email webhook:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /webhooks/:triggerId
 * Public webhook endpoint to trigger workflow execution.
 * Receives POST request body as trigger payload and enqueues workflow execution job.
 */
router.post('/:triggerId', async (req, res) => {
  const { triggerId } = req.params;

  try {
    // Load trigger by ID to get associated workflow
    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: {
        workflow: true,
      },
    });

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Extract request body as trigger payload
    const triggerPayload = req.body || {};

    // Enqueue workflow execution job
    // Job is enqueued asynchronously - request returns immediately
    // Retry configuration: minimal retries at job level since step-level retries handle transient failures
    await workflowExecutionQueue.add(
      'workflow-execution',
      {
        workflowId: trigger.workflow.id,
        triggerPayload: triggerPayload as Record<string, unknown>,
      },
      {
        // Job-level retry as safety net for catastrophic failures
        // Step-level retries (in WorkflowExecutor) handle transient step failures
        attempts: 2, // 1 initial attempt + 1 retry
        backoff: {
          type: 'exponential',
          delay: 2000, // 2 seconds initial delay
        },
      },
    );

    // Return success response immediately (workflow executes in background)
    res.status(200).json({
      success: true,
      message: 'Webhook received and workflow execution enqueued',
      workflowId: trigger.workflow.id,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as webhooksRouter };
