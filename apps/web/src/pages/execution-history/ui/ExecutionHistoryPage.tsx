'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import { ExecutionCard } from '@aflow/web/entities/execution';
import { fetchWorkflowExecutions, fetchWorkflow } from '@aflow/web/shared/lib/api-client';
import type {
  ExecutionResponse,
  WorkflowResponse,
} from '@aflow/web/shared/types/workflows';
import Link from 'next/link';

export function ExecutionHistoryPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const workflowId = params?.id as string;

  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [executions, setExecutions] = useState<ExecutionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!workflowId) return;

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        
        const [workflowData, executionsData] = await Promise.all([
          fetchWorkflow(workflowId, token),
          fetchWorkflowExecutions(workflowId, token),
        ]);
        
        setWorkflow(workflowData);
        setExecutions(executionsData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load execution history';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error loading execution history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workflowId, getToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-gray-500">Loading execution history...</div>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-red-600">Error: {error || 'Workflow not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={`/app/workflows/${workflowId}`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to workflow
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Execution History
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {workflow.name}
            </p>
          </div>

          {executions.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-500">No executions found</p>
              <p className="mt-2 text-sm text-gray-400">
                Executions will appear here once the workflow runs
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <ExecutionCard
                  key={execution.id}
                  execution={execution}
                  workflowId={workflowId}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
