'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';
import { updateWorkflow } from '@aflow/web/shared/lib/api-client';
import { cn } from '@aflow/web/shared/lib';

interface WorkflowCardProps {
  workflow: WorkflowResponse;
  onStatusChange?: (updatedWorkflow: WorkflowResponse) => void;
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

export function WorkflowCard({ workflow, onStatusChange }: WorkflowCardProps) {
  const { getToken } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowResponse>(workflow);

  // Sync workflow prop changes
  useEffect(() => {
    setCurrentWorkflow(workflow);
  }, [workflow]);
  
  const stepsCount = currentWorkflow.steps.length;
  const triggerType = currentWorkflow.trigger?.type || 'No trigger';
  const isPublished = currentWorkflow.status === 'published' || currentWorkflow.status === 'active';
  const isEnabled = currentWorkflow.status === 'active';

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isPublished || isToggling) {
      return;
    }

    const newStatus = isEnabled ? 'published' : 'active';

    try {
      setIsToggling(true);
      const token = await getToken();
      const result = await updateWorkflow(
        currentWorkflow.id,
        {
          name: currentWorkflow.name,
          status: newStatus,
          trigger: currentWorkflow.trigger
            ? {
                type: currentWorkflow.trigger.type,
                config: currentWorkflow.trigger.config,
              }
            : undefined,
          steps: currentWorkflow.steps.map((step) => ({
            type: step.type,
            config: step.config,
            order: step.order,
          })),
        },
        token,
      );

      setCurrentWorkflow(result);
      onStatusChange?.(result);
      toast.success(
        isEnabled
          ? 'Workflow disabled successfully'
          : 'Workflow enabled successfully',
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to ${isEnabled ? 'disable' : 'enable'} workflow`;
      toast.error(errorMessage);
      console.error('Error updating workflow status:', err);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Toggle button in upper-right corner */}
      {isPublished && (
        <div className="absolute right-4 top-4">
          <label className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-disabled={!isPublished || isToggling}
              onClick={handleToggleStatus}
              disabled={!isPublished || isToggling}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-1',
                isEnabled ? 'bg-green-600' : 'bg-gray-300',
                !isPublished && 'cursor-not-allowed opacity-50',
                isToggling && 'cursor-wait opacity-75',
              )}
              title={
                !isPublished
                  ? 'Publish workflow to enable it'
                  : isEnabled
                    ? 'Disable workflow'
                    : 'Enable workflow'
              }
            >
              <span
                className={cn(
                  'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                  isEnabled ? 'translate-x-5' : 'translate-x-1',
                )}
              >
                {isToggling && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 animate-spin rounded-full border border-gray-300 border-t-transparent" />
                  </span>
                )}
              </span>
            </button>
          </label>
        </div>
      )}

      <Link
        href={`/app/workflows/${currentWorkflow.id}`}
        className="block"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentWorkflow.name}
              </h3>
              {getStatusIcon(currentWorkflow.status)}
            </div>
            <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
              <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
              <span>•</span>
              <span className="capitalize">{triggerType}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(currentWorkflow.status)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
          <span>
            Updated {new Date(currentWorkflow.updatedAt).toLocaleDateString()}
          </span>
          <span>Created {new Date(currentWorkflow.createdAt).toLocaleDateString()}</span>
        </div>
      </Link>
    </div>
  );
}
