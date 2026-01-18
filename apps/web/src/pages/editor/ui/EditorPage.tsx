'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { TopNavBar, WorkflowCanvas } from '@aflow/web/features/workflow-editor';
import { StepConfigPanel as ConfigPanel } from '@aflow/web/features/configure-step';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import {
  fetchWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '@aflow/web/shared/lib/api-client';
import type { WorkflowResponse } from '@aflow/web/shared/types/workflows';

export function EditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const workflowId = searchParams?.get('id') || null;

  const {
    workflow,
    trigger,
    actions,
    loadWorkflow,
    setWorkflowName,
    reset,
    setLoading,
    setError,
    isLoading,
    error,
    isConfigPanelOpen,
  } = useEditorStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Load workflow on mount if ID is provided
  useEffect(() => {
    const load = async () => {
      if (workflowId) {
        try {
          setLoading(true);
          setError(null);
          const token = await getToken();
          const data = await fetchWorkflow(workflowId, token);
          loadWorkflow(data);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to load workflow',
          );
          console.error('Error loading workflow:', err);
        } finally {
          setLoading(false);
          setIsInitialized(true);
        }
      } else {
        // New workflow - initialize with defaults
        setWorkflowName('Untitled Workflow');
        setIsInitialized(true);
      }
    };

    load();
  }, [
    workflowId,
    loadWorkflow,
    setWorkflowName,
    setLoading,
    setError,
    getToken,
  ]);

  const handlePublish = async () => {
    if (!workflow) {
      return;
    }

    // Validate workflow
    if (!trigger) {
      const errorMessage = 'Workflow must have a trigger';
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    if (actions.length === 0) {
      const errorMessage = 'Workflow must have at least one action';
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const workflowData = {
        name: workflow.name,
        status: 'published',
        trigger: {
          // For webhook triggers, pass the trigger ID so backend can use it
          // For other triggers, ID is optional and will be auto-generated if not provided
          ...(trigger.id && trigger.type === 'webhook' ? { id: trigger.id } : {}),
          type: trigger.type,
          config: trigger.config,
        },
        steps: actions.map((action) => ({
          type: action.type,
          config: action.config,
          order: action.order,
        })),
      };

      const token = await getToken();
      let result: WorkflowResponse;
      if (workflow.id) {
        result = await updateWorkflow(workflow.id, workflowData, token);
        toast.success('Workflow published successfully');
      } else {
        result = await createWorkflow(workflowData, token);
        // Update URL with new workflow ID
        router.replace(`/app/editor?id=${result.id}`);
        toast.success('Workflow created and published successfully');
      }

      loadWorkflow(result);
      // Success - workflow state is updated, UI will reflect the change
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to publish workflow';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error publishing workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (newName: string) => {
    setWorkflowName(newName);

    // If workflow exists, save the name
    if (workflow?.id) {
      try {
        const token = await getToken();
        await updateWorkflow(
          workflow.id,
          {
            name: newName,
            status: workflow.status,
            steps: workflow.steps,
          },
          token,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to rename workflow',
        );
        console.error('Error renaming workflow:', err);
      }
    }
  };

  const handleDelete = async () => {
    if (!workflow?.id) {
      // New workflow - just reset
      reset();
      router.push('/app');
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      await deleteWorkflow(workflow.id, token);
      reset();
      router.push('/app');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete workflow',
      );
      console.error('Error deleting workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (enabled: boolean) => {
    if (!workflow?.id) {
      return;
    }

    // Determine new status
    const newStatus = enabled ? 'active' : 'published';

    try {
      const token = await getToken();
      const result = await updateWorkflow(
        workflow.id,
        {
          name: workflow.name,
          status: newStatus,
          trigger: trigger
            ? {
                type: trigger.type,
                config: trigger.config,
              }
            : undefined,
          steps: actions.map((action) => ({
            type: action.type,
            config: action.config,
            order: action.order,
          })),
        },
        token,
      );

      // Update with server response
      loadWorkflow(result);
      toast.success(
        enabled
          ? 'Workflow enabled successfully'
          : 'Workflow disabled successfully',
      );
    } catch (err) {
      // Reload from server to ensure state is correct
      if (workflow.id) {
        try {
          const token = await getToken();
          const current = await fetchWorkflow(workflow.id, token);
          loadWorkflow(current);
        } catch (reloadErr) {
          console.error('Failed to reload workflow after error:', reloadErr);
        }
      }
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to ${enabled ? 'enable' : 'disable'} workflow`;
      toast.error(errorMessage);
      console.error('Error updating workflow status:', err);
    }
  };

  const isPublishDisabled =
    !isInitialized ||
    isLoading ||
    !trigger ||
    actions.length === 0 ||
    !workflow?.name.trim();

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNavBar
        onPublish={handlePublish}
        onRename={handleRename}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        isPublishDisabled={isPublishDisabled}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <WorkflowCanvas />
        </div>
        {isConfigPanelOpen && <ConfigPanel />}
      </div>
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-6 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
