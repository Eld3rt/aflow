'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@aflow/web/shared/lib/cn';
import type { EditorTrigger, EditorAction } from '@aflow/web/shared/stores/editor-store';
import {
  getTriggerOutputSchema,
  getActionOutputSchema,
  type StepOutputSchema,
} from '../schemas/output-schemas';

interface DraggableAvailableDataPanelProps {
  trigger: EditorTrigger | null;
  actions: EditorAction[];
  currentStepOrder: number | null;
  onFieldClick: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

interface FieldTreeProps {
  schema: StepOutputSchema;
  onFieldClick: (path: string) => void;
}

function FieldTree({ schema, onFieldClick }: FieldTreeProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-700 px-2 py-1">
        {schema.stepName}
      </div>
      <div className="pl-2 space-y-0.5">
        {Object.entries(schema.fields).map(([key, field]) => (
          <FieldItem
            key={key}
            fieldKey={key}
            field={field}
            path={key}
            onFieldClick={onFieldClick}
            indent={0}
          />
        ))}
      </div>
    </div>
  );
}

interface FieldItemProps {
  fieldKey: string;
  field: {
    name: string;
    type: string;
    description?: string;
    children?: Record<string, any>;
  };
  path: string;
  onFieldClick: (path: string) => void;
  indent: number;
}

function FieldItem({
  fieldKey,
  field,
  path,
  onFieldClick,
  indent,
}: FieldItemProps) {
  const hasChildren = field.children && Object.keys(field.children).length > 0;

  if (hasChildren) {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded cursor-pointer transition-colors',
            indent === 0 && 'pl-2',
            indent === 1 && 'pl-6',
            indent === 2 && 'pl-10',
          )}
          style={{ paddingLeft: `${8 + indent * 16}px` }}
          onClick={() => onFieldClick(path)}
        >
          <span className="text-gray-400">▼</span>
          <span className="font-medium">{field.name}</span>
          <span className="text-gray-400">({field.type})</span>
        </div>
        {field.children && (
          <div className="pl-4 space-y-0.5">
            {Object.entries(field.children).map(([childKey, childField]) => (
              <FieldItem
                key={childKey}
                fieldKey={childKey}
                field={childField}
                path={`${path}.${childKey}`}
                onFieldClick={onFieldClick}
                indent={indent + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded cursor-pointer transition-colors flex items-center gap-1"
      style={{ paddingLeft: `${8 + indent * 16}px` }}
      onClick={() => onFieldClick(path)}
      title={field.description || field.name}
    >
      <span className="font-mono">{field.name}</span>
      <span className="text-gray-400 text-[10px]">({field.type})</span>
    </div>
  );
}

export function DraggableAvailableDataPanel({
  trigger,
  actions,
  currentStepOrder,
  onFieldClick,
  isOpen,
  onClose,
  position,
  onPositionChange,
}: DraggableAvailableDataPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const availableSchemas = useMemo(() => {
    const schemas: StepOutputSchema[] = [];

    if (trigger) {
      const triggerSchema = getTriggerOutputSchema(trigger.type);
      if (triggerSchema) {
        schemas.push(triggerSchema);
      }
    }

    const sortedActions = [...actions].sort((a, b) => a.order - b.order);
    for (const action of sortedActions) {
      if (
        currentStepOrder !== null &&
        action.order >= currentStepOrder
      ) {
        continue;
      }

      const actionSchema = getActionOutputSchema(action.type);
      if (actionSchema) {
        schemas.push({
          ...actionSchema,
          stepName: `${actionSchema.stepName} (Step ${action.order + 1})`,
        });
      }
    }

    return schemas;
  }, [trigger, actions, currentStepOrder]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      onPositionChange({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  if (!isOpen) return null;

  if (availableSchemas.length === 0) {
    return (
      <div
        ref={panelRef}
        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-80"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div
          className="flex items-center justify-between border-b border-gray-200 px-4 py-3 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Available Data</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500">
            No previous steps available. Configure a trigger or add actions before this step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-80 max-h-96 flex flex-col"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div
        className="flex items-center justify-between border-b border-gray-200 px-4 py-3 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Available Data</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        <p className="text-xs text-gray-500 mb-3">
          Click a field to insert its placeholder. Values will be resolved when the workflow runs.
        </p>
        <div className="space-y-3">
          {availableSchemas.map((schema, index) => (
            <FieldTree key={index} schema={schema} onFieldClick={onFieldClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
