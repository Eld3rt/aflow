'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import { ExecutionTimeline, ExecutionLogs } from '@aflow/web/features/view-execution';
import {
  fetchExecution,
  fetchExecutionLogs,
  fetchWorkflow,
} from '@aflow/web/shared/lib/api-client';
import type {
  ExecutionDetailResponse,
  ExecutionLogResponse,
  WorkflowResponse,
} from '@aflow/web/shared/types/workflows';
import Link from 'next/link';

export function ExecutionDetailsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const workflowId = params?.id as string;
  const executionId = params?.executionId as string;

  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [execution, setExecution] = useState<ExecutionDetailResponse | null>(null);
  const [logs, setLogs] = useState<ExecutionLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!workflowId || !executionId) return;

      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        
        const [workflowData, executionData, logsData] = await Promise.all([
          fetchWorkflow(workflowId, token),
          fetchExecution(workflowId, executionId, token),
          fetchExecutionLogs(workflowId, executionId, token),
        ]);
        
        setWorkflow(workflowData);
        setExecution(executionData);
        setLogs(logsData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load execution details';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error loading execution details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workflowId, executionId, getToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-gray-500">Loading execution details...</div>
        </div>
      </div>
    );
  }

  if (error || !execution || !workflow) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-red-600">Error: {error || 'Execution not found'}</div>
        </div>
      </div>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            <XCircle className="h-4 w-4" />
            Failed
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
            <PauseCircle className="h-4 w-4" />
            Paused
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            <Clock className="h-4 w-4 animate-spin" />
            Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            <Clock className="h-4 w-4" />
            {status}
          </span>
        );
    }
  }

  function formatDuration(seconds: number) {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={`/app/workflows/${workflowId}/executions`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to execution history
            </Link>
          </div>

          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Execution Details
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {workflow.name}
                </p>
                <p className="mt-1 text-xs font-mono text-gray-500">
                  {execution.id}
                </p>
              </div>
              {getStatusBadge(execution.status)}
            </div>

            {execution.error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Error</p>
                    <p className="mt-1 text-sm text-red-700">{execution.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Duration</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {formatDuration(execution.duration)}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Steps Executed</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {execution.stepsCount}
                </p>
              </div>
              {execution.currentStepOrder !== null && (
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Current Step</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {execution.currentStepOrder}
                  </p>
                </div>
              )}
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Started</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {new Date(execution.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {execution.pausedAt && (
              <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <PauseCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Paused At</p>
                    <p className="mt-1 text-sm text-yellow-700">
                      {new Date(execution.pausedAt).toLocaleString()}
                    </p>
                    {execution.resumeAt && (
                      <p className="mt-1 text-xs text-yellow-600">
                        Scheduled to resume: {new Date(execution.resumeAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <ExecutionTimeline logs={logs} />
          </div>

          <div>
            <ExecutionLogs logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}
