'use client';

import { Zap } from 'lucide-react';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { cn } from '@aflow/web/shared/lib/cn';

export function TriggerCard() {
  const trigger = useEditorStore((state) => state.trigger);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);

  const isSelected = selectedNodeId === trigger?.id;

  const handleClick = () => {
    const triggerId = trigger?.id || 'trigger-new';
    selectNode(triggerId, 'trigger');
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
          <h3 className="text-sm font-medium text-gray-900">Trigger</h3>
          <p className="mt-1 text-xs text-gray-500">
            {trigger
              ? `1. ${trigger.type.charAt(0).toUpperCase() + trigger.type.slice(1)} trigger configured`
              : '1. Select the event that starts your workflow'}
          </p>
        </div>
      </div>
    </div>
  );
}
