'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';
import { updateWorkflow } from '@aflow/web/shared/lib/api-client';
import { cn } from '@aflow/web/shared/lib';

interface ToggleWorkflowButtonProps {
  workflow: WorkflowResponse;
  onStatusChange?: (updatedWorkflow: WorkflowResponse) => void;
  variant?: 'card' | 'header';
}

export function ToggleWorkflowButton({
  workflow,
  onStatusChange,
  variant = 'card',
}: ToggleWorkflowButtonProps) {
  const { getToken } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  
  const isPublished = workflow.status === 'published' || workflow.status === 'active';
  const isEnabled = workflow.status === 'active';

  const handleToggle = async (e: React.MouseEvent) => {
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
        workflow.id,
        {
          name: workflow.name,
          status: newStatus,
          trigger: workflow.trigger
            ? {
                type: workflow.trigger.type,
                config: workflow.trigger.config,
              }
            : undefined,
          steps: workflow.steps.map((step) => ({
            type: step.type,
            config: step.config,
            order: step.order,
          })),
        },
        token,
      );

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

  const buttonSize = variant === 'card' ? 'h-5 w-9' : 'h-6 w-11';
  const thumbSize = variant === 'card' ? 'h-3 w-3' : 'h-4 w-4';
  const translateX = variant === 'card' ? 'translate-x-5' : 'translate-x-6';
  const ringOffset = variant === 'card' ? 'focus:ring-offset-1' : 'focus:ring-offset-2';
  const spinnerSize = variant === 'card' ? 'h-1.5 w-1.5' : 'h-2 w-2';

  return (
    <label className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-disabled={!isPublished || isToggling}
        onClick={handleToggle}
        disabled={!isPublished || isToggling}
        className={cn(
          `relative inline-flex ${buttonSize} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 ${ringOffset}`,
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
            `inline-block ${thumbSize} transform rounded-full bg-white transition-transform`,
            isEnabled ? translateX : 'translate-x-1',
          )}
        >
          {isToggling && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className={`${spinnerSize} animate-spin rounded-full border border-gray-300 border-t-transparent`} />
            </span>
          )}
        </span>
      </button>
    </label>
  );
}
