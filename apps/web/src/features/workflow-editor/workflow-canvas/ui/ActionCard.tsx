'use client';

import { Trash2, Zap } from 'lucide-react';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { cn } from '@aflow/web/shared/lib/cn';

interface ActionCardProps {
  actionId: string;
  order: number;
}

export function ActionCard({ actionId, order }: ActionCardProps) {
  const actions = useEditorStore((state) => state.actions);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const removeAction = useEditorStore((state) => state.removeAction);

  const action = actions.find((a) => a.id === actionId);
  const isSelected = selectedNodeId === actionId;

  if (!action) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click originated from the delete button
    // The delete button already calls stopPropagation, but we check here as a safety measure
    const target = e.target as {
      tagName?: string;
      getAttribute?: (name: string) => string | null;
    };
    if (
      target.tagName === 'BUTTON' ||
      target.getAttribute?.('aria-label') === 'Delete action'
    ) {
      return;
    }
    selectNode(actionId, 'action');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeAction(actionId);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative w-80 cursor-pointer rounded-lg border bg-white p-4 shadow-xl transition-all',
        isSelected
          ? 'border-black ring-2 ring-neutral-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-xl/20',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
          <Zap className="h-5 w-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">Action</h3>
          <p className="mt-1 text-xs text-gray-500">
            {action.type === ''
              ? `${order + 2}. Select the event for your workflow to run`
              : `${order + 2}. ${action.type.charAt(0).toUpperCase() + action.type.slice(1)} action configured`}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete action"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
