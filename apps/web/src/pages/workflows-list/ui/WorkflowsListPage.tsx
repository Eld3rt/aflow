'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import { WorkflowCard } from '@aflow/web/widgets/workflow-card';
import { fetchWorkflows } from '@aflow/web/shared/lib/api-client';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';

export function WorkflowsListPage() {
  const { getToken } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflows = async () => {

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        const data = await fetchWorkflows(token);
        setWorkflows(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load workflows';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error loading workflows:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-gray-500">Loading workflows...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and monitor your automated workflows
            </p>
          </div>

          {workflows.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-500">No workflows found</p>
              <p className="mt-2 text-sm text-gray-400">
                Create your first workflow to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
