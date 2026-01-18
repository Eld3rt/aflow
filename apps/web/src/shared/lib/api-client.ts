import type {
  WorkflowResponse,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ExecutionResponse,
  ExecutionDetailResponse,
  ExecutionLogResponse,
  WorkflowStatisticsResponse,
  GlobalStatisticsResponse,
} from '../types/workflows';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Creates fetch headers with authentication token
 * Token should be obtained from useAuth() hook in client components
 */
function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchWorkflow(
  id: string,
  token?: string | null,
): Promise<WorkflowResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.statusText}`);
  }
  return response.json() as Promise<WorkflowResponse>;
}

export async function createWorkflow(
  data: CreateWorkflowRequest,
  token?: string | null,
): Promise<WorkflowResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as { error?: string };
    throw new Error(
      error.error || `Failed to create workflow: ${response.statusText}`,
    );
  }
  return response.json() as Promise<WorkflowResponse>;
}

export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowRequest,
  token?: string | null,
): Promise<WorkflowResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as { error?: string };
    throw new Error(
      error.error || `Failed to update workflow: ${response.statusText}`,
    );
  }
  return response.json() as Promise<WorkflowResponse>;
}

export async function deleteWorkflow(
  id: string,
  token?: string | null,
): Promise<void> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to delete workflow: ${response.statusText}`);
  }
}

export async function fetchWorkflows(
  token?: string | null,
): Promise<WorkflowResponse[]> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch workflows: ${response.statusText}`);
  }
  return response.json() as Promise<WorkflowResponse[]>;
}

export async function fetchWorkflowExecutions(
  workflowId: string,
  token?: string | null,
): Promise<ExecutionResponse[]> {
  const headers = getAuthHeaders(token);
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/executions`,
    {
      headers,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch executions: ${response.statusText}`);
  }
  return response.json() as Promise<ExecutionResponse[]>;
}

export async function fetchExecution(
  workflowId: string,
  executionId: string,
  token?: string | null,
): Promise<ExecutionDetailResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/executions/${executionId}`,
    {
      headers,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch execution: ${response.statusText}`);
  }
  return response.json() as Promise<ExecutionDetailResponse>;
}

export async function fetchExecutionLogs(
  workflowId: string,
  executionId: string,
  token?: string | null,
): Promise<ExecutionLogResponse[]> {
  const headers = getAuthHeaders(token);
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/executions/${executionId}/logs`,
    {
      headers,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch execution logs: ${response.statusText}`);
  }
  return response.json() as Promise<ExecutionLogResponse[]>;
}

export async function fetchWorkflowStatistics(
  workflowId: string,
  token?: string | null,
): Promise<WorkflowStatisticsResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/statistics`,
    {
      headers,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.statusText}`);
  }
  return response.json() as Promise<WorkflowStatisticsResponse>;
}

export async function fetchGlobalStatistics(
  token?: string | null,
): Promise<GlobalStatisticsResponse> {
  const headers = getAuthHeaders(token);
  const response = await fetch(`${API_BASE_URL}/workflows/statistics`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch global statistics: ${response.statusText}`);
  }
  return response.json() as Promise<GlobalStatisticsResponse>;
}
