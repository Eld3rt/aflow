'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowStatusIcon } from './WorkflowStatusIcon';
import { ToggleWorkflowButton } from '@aflow/web/features/toggle-workflow';

interface WorkflowCardProps {
  workflow: WorkflowResponse;
  onStatusChange?: (updatedWorkflow: WorkflowResponse) => void;
}

export function WorkflowCard({ workflow, onStatusChange }: WorkflowCardProps) {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowResponse>(workflow);

  // Sync workflow prop changes
  useEffect(() => {
    setCurrentWorkflow(workflow);
  }, [workflow]);
  
  const stepsCount = currentWorkflow.steps.length;
  const triggerType = currentWorkflow.trigger?.type || 'No trigger';
  const isPublished = currentWorkflow.status === 'published' || currentWorkflow.status === 'active';

  const handleStatusChange = (updatedWorkflow: WorkflowResponse) => {
    setCurrentWorkflow(updatedWorkflow);
    onStatusChange?.(updatedWorkflow);
  };

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Toggle button in upper-right corner */}
      {isPublished && (
        <div className="absolute right-4 top-4">
          <ToggleWorkflowButton
            workflow={currentWorkflow}
            onStatusChange={handleStatusChange}
          />
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
              <WorkflowStatusIcon status={currentWorkflow.status} />
            </div>
            <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
              <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
              <span>•</span>
              <span className="capitalize">{triggerType}</span>
            </div>
            <div className="flex items-center gap-2">
              <WorkflowStatusBadge status={currentWorkflow.status} />
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
