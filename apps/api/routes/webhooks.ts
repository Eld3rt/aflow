import { Router } from 'express';
import { prisma } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';
import {
  normalizeEmailPayload,
  type NormalizedEmailPayload,
} from '../utils/email.js';

const router = Router();

/**
 * @swagger
 * /webhooks/email:
 *   post:
 *     summary: Email webhook endpoint (provider-agnostic)
 *     description: Normalizes email payload and triggers workflow matching recipient email address
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookEmailPayload'
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookEmailResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/email', async (req, res) => {
  try {
    // Normalize email payload from any provider format
    const normalizedEmail: NormalizedEmailPayload = normalizeEmailPayload(
      req.body,
    );

    // Collect all recipient addresses (to, cc, bcc) - already normalized by normalizeEmailPayload
    const recipientAddresses: string[] = [];
    normalizedEmail.to.forEach((addr) => recipientAddresses.push(addr));
    if (normalizedEmail.cc) {
      normalizedEmail.cc.forEach((addr) => recipientAddresses.push(addr));
    }
    if (normalizedEmail.bcc) {
      normalizedEmail.bcc.forEach((addr) => recipientAddresses.push(addr));
    }

    // Find the workflow whose trigger has an inboundEmail matching any recipient address
    // Use Prisma JSON filtering with OR condition to match any recipient address at database level
    const matchingWorkflow =
      recipientAddresses.length > 0
        ? await prisma.workflow.findFirst({
            where: {
              status: 'active',
              OR: recipientAddresses.map((address) => ({
                trigger: {
                  type: 'email',
                  config: {
                    path: ['inboundEmail'],
                    equals: address,
                  },
                },
              })),
            },
            include: {
              trigger: true,
            },
          })
        : null;

    // Enqueue workflow execution only if a matching workflow was found
    if (matchingWorkflow) {
      await workflowExecutionQueue.add(
        'workflow-execution',
        {
          workflowId: matchingWorkflow.id,
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
      );

      // Return success response immediately (workflow executes in background)
      res.status(200).json({
        success: true,
        message: 'Email webhook received and workflow execution enqueued',
        workflowId: matchingWorkflow.id,
        email: {
          from: normalizedEmail.from,
          subject: normalizedEmail.subject,
        },
      });
    } else {
      // No matching workflow found - return 200 OK as per spec
      res.status(200).json({
        success: true,
        message: 'Email webhook received, but no matching workflow found',
        workflowsTriggered: 0,
        email: {
          from: normalizedEmail.from,
          subject: normalizedEmail.subject,
        },
      });
    }
  } catch (error) {
    console.error('Error processing email webhook:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * @swagger
 * /webhooks/{triggerId}:
 *   post:
 *     summary: Generic webhook endpoint to trigger workflow execution
 *     description: Receives POST request body as trigger payload and enqueues workflow execution job
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Trigger ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookGenericPayload'
 *     responses:
 *       200:
 *         description: Webhook received and workflow execution enqueued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookGenericResponse'
 *       404:
 *         description: Trigger not found
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
router.post('/:triggerId', async (req, res) => {
  const { triggerId } = req.params;

  try {
    // Load trigger by ID to get associated workflow
    const trigger = await prisma.trigger.findUnique({
      where: {
        id: triggerId,
        workflow: {
          status: 'active',
        },
      },
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
