'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { Database, PlayCircle } from 'lucide-react';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import { WorkflowCard } from '@aflow/web/widgets/workflow-card';
import {
  fetchWorkflows,
  fetchGlobalStatistics,
} from '@aflow/web/shared/lib/api-client';
import type {
  WorkflowResponse,
  GlobalStatisticsResponse,
} from '@aflow/web/shared/types/workflows';

export function WorkflowsListPage() {
  const { getToken } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowResponse[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflows = async () => {

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        const [workflowsData, statsData] = await Promise.all([
          fetchWorkflows(token),
          fetchGlobalStatistics(token).catch(() => null), // Don't fail if stats fail
        ]);
        setWorkflows(workflowsData);
        setGlobalStats(statsData);
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

          {globalStats && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-gray-600" />
                  <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {globalStats.totalWorkflows}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-gray-600" />
                  <p className="text-sm font-medium text-gray-600">Total Executions</p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {globalStats.totalExecutions}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <p className="text-sm font-medium text-green-900">Successful</p>
                <p className="mt-2 text-3xl font-semibold text-green-900">
                  {globalStats.successCount}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <p className="text-sm font-medium text-red-900">Failed</p>
                <p className="mt-2 text-3xl font-semibold text-red-900">
                  {globalStats.failureCount}
                </p>
              </div>
            </div>
          )}

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
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onStatusChange={(updatedWorkflow) => {
                    // Update the workflow in the list
                    setWorkflows((prev) =>
                      prev.map((w) =>
                        w.id === updatedWorkflow.id ? updatedWorkflow : w,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
