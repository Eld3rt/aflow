'use client';

import { Plus } from 'lucide-react';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';

export function AddStepButton() {
  const addAction = useEditorStore((state) => state.addAction);

  return (
    <div className="flex items-center justify-center py-2">
      <button
        onClick={addAction}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-black hover:bg-neutral-50 hover:text-black"
        aria-label="Add step"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
