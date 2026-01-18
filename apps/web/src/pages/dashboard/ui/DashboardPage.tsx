'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  Database,
  PlayCircle,
  ArrowRight,
  PlusCircle,
  BookOpen,
  Activity,
} from 'lucide-react';
import { DashboardNav } from '@aflow/web/widgets/dashboard-nav';
import {
  fetchWorkflows,
  fetchGlobalStatistics,
  fetchWorkflowExecutions,
} from '@aflow/web/shared/lib/api-client';
import type {
  WorkflowResponse,
  ExecutionResponse,
  GlobalStatisticsResponse,
} from '@aflow/web/shared/types/workflows';

interface ExecutionWithWorkflow extends ExecutionResponse {
  workflowName: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    case 'published':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
          <Clock className="h-3 w-3" />
          Published
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          <PauseCircle className="h-3 w-3" />
          Draft
        </span>
      );
  }
}

function getExecutionStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
          <PauseCircle className="h-3 w-3" />
          Paused
        </span>
      );
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          <Clock className="h-3 w-3 animate-spin" />
          Running
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          <Clock className="h-3 w-3" />
          {status}
        </span>
      );
  }
}

function formatDuration(createdAt: string, updatedAt: string) {
  const start = new Date(createdAt);
  const end = new Date(updatedAt);
  const durationMs = end.getTime() - start.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);

  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function DashboardPage() {
  const { getToken } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowResponse[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStatisticsResponse | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionWithWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate derived statistics
  const activeWorkflowsCount = useMemo(() => {
    return workflows.filter((w) => w.status === 'active').length;
  }, [workflows]);

  const executionsLast24h = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return recentExecutions.filter((e) => new Date(e.createdAt) >= last24h).length;
  }, [recentExecutions]);

  const failedExecutionsLast24h = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return recentExecutions.filter(
      (e) => e.status === 'failed' && new Date(e.createdAt) >= last24h,
    ).length;
  }, [recentExecutions]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();

        // Fetch workflows and global stats in parallel
        const [workflowsData, statsData] = await Promise.all([
          fetchWorkflows(token),
          fetchGlobalStatistics(token).catch(() => null),
        ]);

        // Sort workflows by updatedAt desc and take most recent
        const sortedWorkflows = [...workflowsData].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setWorkflows(sortedWorkflows);
        setGlobalStats(statsData);

        // Fetch recent executions from all workflows
        // Limit to recent 5 executions per workflow to avoid too many API calls
        const executionPromises = sortedWorkflows.slice(0, 10).map(async (workflow) => {
          try {
            const executions = await fetchWorkflowExecutions(workflow.id, token);
            return executions.slice(0, 5).map((execution) => ({
              ...execution,
              workflowName: workflow.name,
            }));
          } catch (err) {
            console.error(`Error fetching executions for workflow ${workflow.id}:`, err);
            return [];
          }
        });

        const allExecutions = (await Promise.all(executionPromises)).flat();
        
        // Sort by createdAt desc and take top 10
        const sortedExecutions = allExecutions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        
        setRecentExecutions(sortedExecutions);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error loading dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <DashboardNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-gray-500">Loading dashboard...</div>
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

  const recentlyUpdatedWorkflows = workflows.slice(0, 7);
  const isEmpty = workflows.length === 0 && recentExecutions.length === 0;

  // Empty state
  if (isEmpty) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardNav />
        <main className="flex-1 bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <Activity className="mx-auto h-16 w-16 text-gray-400" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Welcome to your Dashboard
              </h2>
              <p className="mt-4 text-gray-600">
                Workflows help you automate repetitive tasks and connect your tools.
                Create your first workflow to get started with automation.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  href="/app/editor"
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-900"
                >
                  <PlusCircle className="h-5 w-5" />
                  Create your first workflow
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <BookOpen className="h-5 w-5" />
                  Learn how it works
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Overview of your workflows and recent activity
            </p>
          </div>

          {/* Key Statistics */}
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
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {activeWorkflowsCount}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-gray-600" />
                  <p className="text-sm font-medium text-gray-600">Executions (24h)</p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {executionsLast24h}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Failed (24h)</p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-red-900">
                  {failedExecutionsLast24h}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Recently Updated Workflows */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recently Updated Workflows
                </h2>
                <Link
                  href="/app/workflows"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  View all
                </Link>
              </div>
              {recentlyUpdatedWorkflows.length === 0 ? (
                <p className="text-sm text-gray-500">No workflows yet</p>
              ) : (
                <div className="space-y-3">
                  {recentlyUpdatedWorkflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/app/workflows/${workflow.id}`}
                      className="block rounded-md border border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-300 hover:bg-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>
                              {workflow.steps.length} {workflow.steps.length === 1 ? 'step' : 'steps'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(workflow.status)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Executions */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Executions</h2>
              </div>
              {recentExecutions.length === 0 ? (
                <p className="text-sm text-gray-500">No executions yet</p>
              ) : (
                <div className="space-y-3">
                  {recentExecutions.slice(0, 7).map((execution) => (
                    <Link
                      key={execution.id}
                      href={`/app/workflows/${execution.workflowId}/executions/${execution.id}`}
                      className="block rounded-md border border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-300 hover:bg-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {execution.workflowName}
                            </h3>
                          </div>
                          <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {new Date(execution.createdAt).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>{formatDuration(execution.createdAt, execution.updatedAt)}</span>
                          </div>
                          {execution.error && (
                            <p className="mb-1 text-xs text-red-600 line-clamp-1">
                              {execution.error}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {getExecutionStatusBadge(execution.status)}
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
