export interface WorkflowResponse {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trigger: {
    id: string;
    type: string;
    config: Record<string, unknown>;
    createdAt: string;
  } | null;
  steps: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    order: number;
    createdAt: string;
  }>;
}

export interface CreateWorkflowRequest {
  name: string;
  status: string;
  trigger?: {
    id?: string; // Optional trigger ID - if provided, will be used instead of auto-generated
    type: string;
    config: Record<string, unknown>;
  };
  steps: Array<{
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
}

export interface UpdateWorkflowRequest {
  name?: string;
  status?: string;
  trigger?: {
    id?: string; // Optional trigger ID - if provided, will be used instead of auto-generated
    type: string;
    config: Record<string, unknown>;
  };
  steps?: Array<{
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
}

export interface ExecutionResponse {
  id: string;
  workflowId: string;
  status: string; // running, paused, failed, completed
  currentStepOrder: number | null;
  pausedAt: string | null;
  resumeAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionDetailResponse extends ExecutionResponse {
  context: Record<string, unknown>;
  duration: number; // Duration in seconds
  stepsCount: number;
  failureReason: string | null;
}

export interface ExecutionLogResponse {
  id: string;
  executionId: string;
  stepId: string;
  stepOrder: number;
  eventType: string; // started, completed, failed, paused, retried
  timestamp: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface WorkflowStatisticsResponse {
  workflowId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  pausedCount: number;
}
