'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { TriggerCard } from './TriggerCard';
import { ActionCard } from './ActionCard';
import { AddStepButton } from './AddStepButton';

interface SortableActionCardProps {
  actionId: string;
  order: number;
}

function SortableActionCard({ actionId, order }: SortableActionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: actionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActionCard actionId={actionId} order={order} />
    </div>
  );
}

export function WorkflowCanvas() {
  const actions = useEditorStore((state) => state.actions);
  const reorderActions = useEditorStore((state) => state.reorderActions);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedActions = [...actions].sort((a, b) => a.order - b.order);
  const actionIds = sortedActions.map((a) => a.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedActions.findIndex((a) => a.id === active.id);
      const newIndex = sortedActions.findIndex((a) => a.id === over.id);
      reorderActions(oldIndex, newIndex);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-gray-50 py-12"
      style={{
        backgroundImage:
          'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <TriggerCard />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={actionIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedActions.map((action, index) => (
              <div key={action.id} className="flex flex-col items-center gap-4">
                <div className="h-0.5 w-12 bg-gray-300" />
                <SortableActionCard actionId={action.id} order={index} />
                {index < sortedActions.length - 1 && (
                  <div className="h-0.5 w-12 bg-gray-300" />
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>

        {sortedActions.length > 0 && (
          <>
            <div className="h-0.5 w-12 bg-gray-300" />
            <AddStepButton />
          </>
        )}

        {sortedActions.length === 0 && <AddStepButton />}
      </div>
    </div>
  );
}
