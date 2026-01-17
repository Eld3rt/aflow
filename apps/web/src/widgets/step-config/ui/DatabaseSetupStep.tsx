'use client';

import { cn } from '@aflow/web/shared/lib/cn';

interface DatabaseSetupStepProps {
  databaseType: string;
  onDatabaseTypeChange: (type: string) => void;
  onContinue: () => void;
}

const DATABASE_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
];

export function DatabaseSetupStep({
  databaseType,
  onDatabaseTypeChange,
  onContinue,
}: DatabaseSetupStepProps) {
  const canContinue = !!databaseType;

  return (
    <div className="flex flex-1 flex-col border-t border-gray-200">
      <div className="flex flex-col space-y-6 p-6">
        {/* Database Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Database Type <span className="text-red-500">*</span>
          </label>
          <select
            value={databaseType}
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              onDatabaseTypeChange(target.value);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="">Choose...</option>
            {DATABASE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-auto mb-6 border-t border-gray-200 pt-6 px-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
            canContinue
              ? 'bg-neutral-600 hover:bg-neutral-700'
              : 'bg-gray-300 cursor-not-allowed',
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
