'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import {
  fetchWorkflow,
  fetchWorkflowStatistics,
} from '@aflow/web/shared/lib/api-client';
import type {
  WorkflowResponse,
  WorkflowStatisticsResponse,
} from '@aflow/web/shared/types/workflows';
import Link from 'next/link';

export function WorkflowDetailsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const workflowId = params?.id as string;

  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [statistics, setStatistics] = useState<WorkflowStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return;

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        
        const [workflowData, statsData] = await Promise.all([
          fetchWorkflow(workflowId, token),
          fetchWorkflowStatistics(workflowId, token),
        ]);
        
        setWorkflow(workflowData);
        setStatistics(statsData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load workflow';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error loading workflow:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId, getToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-gray-500">Loading workflow...</div>
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

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            Active
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            <Clock className="h-4 w-4" />
            Published
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            <PauseCircle className="h-4 w-4" />
            Draft
          </span>
        );
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/app/workflows"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to workflows
            </Link>
          </div>

          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Created {new Date(workflow.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(workflow.status)}
                <Link
                  href={`/app/editor?id=${workflow.id}`}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  Edit
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Steps</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {workflow.steps.length}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Trigger</p>
                <p className="mt-1 text-sm font-medium text-gray-900 capitalize">
                  {workflow.trigger?.type || 'No trigger'}
                </p>
              </div>
              {statistics && (
                <>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Total Executions</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {statistics.totalExecutions}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {statistics.totalExecutions > 0
                        ? Math.round(
                            (statistics.successCount / statistics.totalExecutions) * 100,
                          )
                        : 0}
                      %
                    </p>
                  </div>
                </>
              )}
            </div>

            {statistics && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Success</p>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-green-900">
                    {statistics.successCount}
                  </p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-900">Failed</p>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-red-900">
                    {statistics.failureCount}
                  </p>
                </div>
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-900">Paused</p>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-yellow-900">
                    {statistics.pausedCount}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <Link
                href={`/app/workflows/${workflow.id}/executions`}
                className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900"
              >
                View Execution History
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Steps</h2>
            <div className="space-y-2">
              {workflow.steps.length === 0 ? (
                <p className="text-sm text-gray-500">No steps configured</p>
              ) : (
                workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {step.type}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {step.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
