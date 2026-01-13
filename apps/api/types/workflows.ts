export interface CreateWorkflowRequest {
  name: string;
  status: string;
  trigger?: {
    type: string;
    config: Record<string, unknown>;
  };
  steps: Array<{
    type: string;
    config: Record<string, unknown>;
    order: number;
  }>;
}

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
