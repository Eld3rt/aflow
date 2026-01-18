'use client';

import { cn } from '@aflow/web/shared/lib/cn';

interface SetupStepProps {
  nodeType: 'trigger' | 'action';
  selectedType: string;
  onTypeChange: (type: string) => void;
  onSubtypeChange?: (subtype: string) => void;
  onContinue: () => void;
  hideContinueButton?: boolean;
}

const TRIGGER_TYPES = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'cron', label: 'Schedule' },
  { value: 'email', label: 'Email' },
];

const ACTION_TYPES = [
  { value: 'http', label: 'HTTP Request' },
  { value: 'email', label: 'Send Email' },
  { value: 'database', label: 'Database Action' },
  { value: 'telegram', label: 'Telegram Message' },
  { value: 'transform', label: 'Data Formatter' },
];

export function SetupStep({
  nodeType,
  selectedType,
  onTypeChange,
  onContinue,
  hideContinueButton = false,
}: SetupStepProps) {
  const types = nodeType === 'trigger' ? TRIGGER_TYPES : ACTION_TYPES;

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Type Selection Dropdown */}
      <div className="flex flex-col space-y-6 h-full p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {nodeType === 'trigger' ? 'Trigger type' : 'Action'} *
        </label>
        <select
          value={selectedType}
          onChange={(e) => {
            const target = e.target as HTMLSelectElement;
            onTypeChange(target.value);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">Choose...</option>
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Continue Button */}
      {!hideContinueButton && (
        <div className="mt-auto mb-6 border-t border-gray-200 pt-6 px-6">
          <button
            type="button"
            onClick={onContinue}
            disabled={!selectedType}
            className={cn(
              'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
              selectedType
                ? 'bg-neutral-600 hover:bg-neutral-700'
                : 'bg-gray-300 cursor-not-allowed',
            )}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
