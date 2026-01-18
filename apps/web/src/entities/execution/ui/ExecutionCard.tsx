'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ExecutionResponse } from '@aflow/web/shared/types/workflows';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { ExecutionStatusIcon } from './ExecutionStatusIcon';

interface ExecutionCardProps {
  execution: ExecutionResponse;
  workflowId: string;
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
            <ExecutionStatusIcon status={execution.status} />
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
            <ExecutionStatusBadge status={execution.status} />
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
