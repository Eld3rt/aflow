'use client';

import { Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@aflow/web/shared/lib/cn';

export type StepStatus = 'completed' | 'active' | 'pending' | 'error';

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface StepNavigationProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
}

export function StepNavigation({ steps, onStepClick }: StepNavigationProps) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStepClick?.(step.id)}
            disabled={step.status === 'pending' || !onStepClick}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              step.status === 'completed' && 'text-green-600',
              step.status === 'active' &&
                'text-neutral-600 border-b-2 border-neutral-600 pb-1',
              step.status === 'error' && 'text-orange-600',
              step.status === 'pending' && 'text-gray-400 cursor-not-allowed',
              step.status !== 'pending' &&
                onStepClick &&
                'hover:text-gray-700 cursor-pointer',
            )}
          >
            {step.status === 'completed' && <Check className="h-4 w-4" />}
            {step.status === 'error' && <AlertCircle className="h-4 w-4" />}
            {step.status === 'pending' && <Clock className="h-4 w-4" />}
            <span>{step.label}</span>
          </button>
          {index < steps.length - 1 && (
            <span className="text-gray-400 mx-1">{'>'}</span>
          )}
        </div>
      ))}
    </div>
  );
}
