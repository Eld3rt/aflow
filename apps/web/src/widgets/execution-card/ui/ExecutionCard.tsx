'use client';

import Link from 'next/link';
import { CheckCircle2, XCircle, PauseCircle, Clock, ArrowRight } from 'lucide-react';
import type { ExecutionResponse } from '@aflow/web/shared/types/workflows';

interface ExecutionCardProps {
  execution: ExecutionResponse;
  workflowId: string;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'paused':
      return <PauseCircle className="h-4 w-4 text-yellow-600" />;
    case 'running':
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getStatusBadge(status: string) {
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

export function ExecutionCard({ execution, workflowId }: ExecutionCardProps) {
  const duration = formatDuration(execution.createdAt, execution.updatedAt);

  return (
    <Link
      href={`/app/workflows/${workflowId}/executions/${execution.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <h3 className="text-sm font-mono text-gray-900">
              {execution.id.slice(0, 8)}...
            </h3>
          </div>
          {execution.error && (
            <p className="mb-2 text-sm text-red-600 line-clamp-2">
              {execution.error}
            </p>
          )}
          <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
            <span>Duration: {duration}</span>
            {execution.currentStepOrder !== null && (
              <>
                <span>•</span>
                <span>Step: {execution.currentStepOrder}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(execution.status)}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
        <span>
          Started {new Date(execution.createdAt).toLocaleString()}
        </span>
        <span>
          {execution.updatedAt !== execution.createdAt && (
            <>Updated {new Date(execution.updatedAt).toLocaleString()}</>
          )}
        </span>
      </div>
    </Link>
  );
}
