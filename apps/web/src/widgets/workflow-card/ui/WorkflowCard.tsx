'use client';

import Link from 'next/link';
import { CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';
import { cn } from '@aflow/web/shared/lib';

interface WorkflowCardProps {
  workflow: WorkflowResponse;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'published':
      return <Clock className="h-4 w-4 text-gray-600" />;
    default:
      return <PauseCircle className="h-4 w-4 text-gray-400" />;
  }
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

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const stepsCount = workflow.steps.length;
  const triggerType = workflow.trigger?.type || 'No trigger';

  return (
    <Link
      href={`/app/workflows/${workflow.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {workflow.name}
            </h3>
            {getStatusIcon(workflow.status)}
          </div>
          <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
            <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
            <span>•</span>
            <span className="capitalize">{triggerType}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(workflow.status)}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
        <span>
          Updated {new Date(workflow.updatedAt).toLocaleDateString()}
        </span>
        <span>Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
