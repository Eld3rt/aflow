import { workflowExecutionQueue } from './queue.js';

console.log('[worker] started');

// Initialize queue connection
workflowExecutionQueue.on('error', (error) => {
  console.error('[worker] Queue error:', error);
});

console.log('[worker] Connected to workflow-execution queue');
