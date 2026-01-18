'use client';

import { cn } from '@aflow/web/shared/lib/cn';

interface FormatterSetupStepProps {
  formatterType: string;
  transformType: string;
  onFormatterTypeChange: (type: string) => void;
  onTransformTypeChange: (type: string) => void;
  onContinue: () => void;
}

const FORMATTER_TYPES = [
  { value: 'date', label: 'Date / Time' },
  { value: 'number', label: 'Numbers' },
  { value: 'text', label: 'Text' },
];

const DATE_TRANSFORM_TYPES = [
  { value: 'addOrSubtractTime', label: 'Add / Subtract Time' },
  { value: 'formatDate', label: 'Format' },
];

const NUMBER_TRANSFORM_TYPES = [
  { value: 'formatNumber', label: 'Format Number' },
  { value: 'formatPhoneNumber', label: 'Format Phone Number' },
  { value: 'performMathOperation', label: 'Perform Math Operation' },
  { value: 'randomNumber', label: 'Random Number' },
];

const TEXT_TRANSFORM_TYPES = [
  { value: 'toUpperCase', label: 'Uppercase' },
  { value: 'toLowerCase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim' },
  { value: 'replace', label: 'Replace' },
  { value: 'length', label: 'Length' },
  { value: 'capitalize', label: 'Capitalize' },
];

export function FormatterSetupStep({
  formatterType,
  transformType,
  onFormatterTypeChange,
  onTransformTypeChange,
  onContinue,
}: FormatterSetupStepProps) {
  const getTransformTypes = () => {
    if (formatterType === 'date') return DATE_TRANSFORM_TYPES;
    if (formatterType === 'number') return NUMBER_TRANSFORM_TYPES;
    if (formatterType === 'text') return TEXT_TRANSFORM_TYPES;
    return [];
  };

  const transformTypes = getTransformTypes();
  const canContinue = formatterType && transformType;

  return (
    <div className="flex flex-1 flex-col border-t border-gray-200">
      <div className="flex flex-col space-y-6 p-6">
        {/* Formatter Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Formatter Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formatterType}
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              onFormatterTypeChange(target.value);
              // Reset transform type when formatter type changes
              onTransformTypeChange('');
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="">Choose...</option>
            {FORMATTER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Transform Type Selection */}
        {formatterType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transform Type <span className="text-red-500">*</span>
            </label>
            <select
              value={transformType}
              onChange={(e) => {
                const target = e.target as HTMLSelectElement;
                onTransformTypeChange(target.value);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Choose...</option>
              {transformTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}
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
