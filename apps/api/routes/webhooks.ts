import { Router } from 'express';
import { prisma } from '@aflow/db';
import { workflowExecutionQueue } from '@aflow/queue';

const router = Router();

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
    await workflowExecutionQueue.add('workflow-execution', {
      workflowId: trigger.workflow.id,
      triggerPayload: triggerPayload as Record<string, unknown>,
    });

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
