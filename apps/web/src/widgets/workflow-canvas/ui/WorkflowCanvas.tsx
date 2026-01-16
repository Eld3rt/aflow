'use client';

import { useState, useRef, useCallback } from 'react';
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-sortable-item
    >
      <ActionCard actionId={actionId} order={order} />
    </div>
  );
}

export function WorkflowCanvas() {
  const actions = useEditorStore((state) => state.actions);
  const reorderActions = useEditorStore((state) => state.reorderActions);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only activate drag after 8px movement (prevents conflict with pan)
      },
    }),
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

  // Pan handlers - use left mouse button + drag on empty space
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start panning if clicking on empty space (not on a draggable card or interactive element)
      const target = e.target as HTMLElement;

      // Check if clicking on interactive elements or cards
      const isInteractive =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        // Check if clicking on sortable items (cards)
        target.closest('[data-sortable-item]') ||
        // Check if clicking on cards (they have specific structure)
        target.closest('div[class*="rounded-lg"][class*="cursor-pointer"]');

      // Only pan if clicking on the background (empty space)
      if (!isInteractive && e.button === 0) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({
          x: e.clientX - panOffset.x,
          y: e.clientY - panOffset.y,
        });
      }
    },
    [panOffset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        e.preventDefault();
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-100/70"
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
        userSelect: isPanning ? 'none' : 'auto',
        backgroundImage:
          'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="flex min-h-screen flex-col items-center py-12"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          pointerEvents: isPanning ? 'none' : 'auto',
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
                <div
                  key={action.id}
                  className="flex flex-col items-center gap-4"
                >
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
    </div>
  );
}
