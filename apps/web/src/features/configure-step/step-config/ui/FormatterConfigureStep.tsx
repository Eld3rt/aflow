'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@aflow/web/shared/lib/cn';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { useTemplateInsertion } from '../hooks/useTemplateInsertion';

interface FormatterConfigureStepProps {
  formatterType: 'date' | 'number' | 'text';
  transformType: string;
  initialValues?: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}

// Zod schemas for each formatter/transform combination
const getSchema = (
  formatterType: 'date' | 'number' | 'text',
  transformType: string,
) => {
  const baseSchema = z.object({
    input: z.string().min(1, 'Input is required'),
  });

  switch (formatterType) {
    case 'date': {
      if (transformType === 'formatDate') {
        return baseSchema.extend({
          format: z.string().min(1, 'Format is required'),
        });
      }
      if (transformType === 'addOrSubtractTime') {
        return baseSchema.extend({
          expression: z
            .string()
            .min(1, 'Expression is required')
            .regex(
              /([+-]?)\s*(\d+)\s+(second|minute|hour|day|week|month|year)s?/i,
              'Invalid expression format. Example: "+8 hours 1 minute"',
            ),
        });
      }
      break;
    }

    case 'number': {
      if (transformType === 'formatNumber') {
        return baseSchema.extend({
          inputDecimalMark: z.enum(['Comma', 'Period']),
          toFormat: z.enum([
            'Comma for grouping & period for decimal',
            'Period for grouping & comma for decimal',
            'Space for grouping & period for decimal',
            'Space for grouping & comma for decimal',
          ]),
        });
      }
      if (transformType === 'formatPhoneNumber') {
        return baseSchema.extend({
          toFormat: z.enum([
            '+15558001212',
            '+1 555-800-1212',
            '(555) 800-1212',
            '+1-555-800-1212',
            '555-800-1212',
            '+1 555 800 1212',
            '555 800-1212',
            '5558001212',
            '15558001212',
          ]),
        });
      }
      if (transformType === 'performMathOperation') {
        return baseSchema
          .extend({
            operation: z.enum([
              'Add',
              'Subtract',
              'Multiply',
              'Divide',
              'Make Negative',
            ]),
            operand: z.number().optional(),
          })
          .refine(
            (data) => {
              // Operand is required for all operations except Make Negative
              if (data.operation !== 'Make Negative' && data.operand === undefined) {
                return false;
              }
              return true;
            },
            {
              message: 'Operand is required for this operation',
              path: ['operand'],
            },
          );
      }
      if (transformType === 'randomNumber') {
        return z
          .object({
            lowerRange: z.number(),
            upperRange: z.number(),
            decimalPoints: z
              .number()
              .int()
              .min(0)
              .max(3)
              .optional()
              .default(0),
          })
          .refine(
            (data) => data.lowerRange <= data.upperRange,
            {
              message: 'Lower range must be less than or equal to upper range',
              path: ['upperRange'],
            },
          );
      }
      break;
    }

    case 'text': {
      if (transformType === 'replace') {
        return baseSchema.extend({
          search: z.string().min(1, 'Search string is required'),
          replace: z.string().optional().default(''),
        });
      }
      // Other text operations (toUpperCase, toLowerCase, trim, length, capitalize) only need input
      return baseSchema;
    }
  }

  return baseSchema;
};

type FormData = Record<string, unknown>;

export function FormatterConfigureStep({
  formatterType,
  transformType,
  initialValues,
  onSave,
}: FormatterConfigureStepProps) {
  const trigger = useEditorStore((state) => state.trigger);
  const actions = useEditorStore((state) => state.actions);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);

  const currentStep = actions.find((a) => a.id === selectedNodeId);
  const currentStepOrder = currentStep?.order ?? null;

  const { insertTemplate } = useTemplateInsertion();

  // Track the last focused input/textarea element
  const lastFocusedElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleFieldClick = (path: string) => {
    // Use tracked element if available, otherwise fall back to document.activeElement
    const targetElement = lastFocusedElementRef.current || document.activeElement;
    
    if (
      targetElement instanceof HTMLInputElement ||
      targetElement instanceof HTMLTextAreaElement
    ) {
      insertTemplate(targetElement, path);
    }
  };

  // Handler to track focused elements
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastFocusedElementRef.current = e.target;
  };

  const schema = getSchema(formatterType, transformType);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    // @ts-expect-error - zodResolver returns a union type that doesn't match FormData exactly, but works at runtime
    resolver: zodResolver(schema),
    defaultValues: (initialValues as FormData) || {},
    mode: 'onChange',
  });

  const mathOperation = watch('operation' as keyof FormData) as
    | 'Add'
    | 'Subtract'
    | 'Multiply'
    | 'Divide'
    | 'Make Negative'
    | undefined;

  const onSubmit = (data: FormData) => {
    // Build config object matching backend schema
    const config: Record<string, unknown> = {
      type: formatterType,
      operation: transformType,
      ...data,
    };

    // For performMathOperation, the backend reads config.operation for the math operation
    // (Add, Subtract, etc.), not the step operation. This overwrites the step operation.
    if (transformType === 'performMathOperation' && 'operation' in data) {
      config.operation = data.operation;
    }

    // For randomNumber, input is not needed
    if (transformType === 'randomNumber' && 'input' in config) {
      delete config.input;
    }

    onSave(config);
  };

  const renderFields = () => {
    switch (formatterType) {
      case 'date':
        if (transformType === 'formatDate') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Date/time value or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.input && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.input.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('format')}
                  onFocus={handleInputFocus}
                  placeholder="ISO or YYYY-MM-DD format"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use ISO or custom format (YYYY-MM-DD, etc.)
                </p>
                {errors.format && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.format.message}
                  </p>
                )}
              </div>
            </>
          );
        }
        if (transformType === 'addOrSubtractTime') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Date/time value or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.input && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.input.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('expression')}
                  onFocus={handleInputFocus}
                  placeholder="+8 hours 1 minute"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: "+8 hours 1 minute", "+1 month -2 days", "-1 day +8
                  hours"
                </p>
                {errors.expression && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.expression.message}
                  </p>
                )}
              </div>
            </>
          );
        }
        break;

      case 'number':
        if (transformType === 'formatNumber') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Number value or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.input && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.input.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Decimal Mark <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('inputDecimalMark')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Choose...</option>
                  <option value="Comma">Comma</option>
                  <option value="Period">Period</option>
                </select>
                {errors.inputDecimalMark && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.inputDecimalMark.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Format <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('toFormat')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Choose...</option>
                  <option value="Comma for grouping & period for decimal">
                    Comma for grouping & period for decimal
                  </option>
                  <option value="Period for grouping & comma for decimal">
                    Period for grouping & comma for decimal
                  </option>
                  <option value="Space for grouping & period for decimal">
                    Space for grouping & period for decimal
                  </option>
                  <option value="Space for grouping & comma for decimal">
                    Space for grouping & comma for decimal
                  </option>
                </select>
                {errors.toFormat && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.toFormat.message}
                  </p>
                )}
              </div>
            </>
          );
        }
        if (transformType === 'formatPhoneNumber') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Phone number or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.input && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.input.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Format <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('toFormat')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Choose...</option>
                  <option value="+15558001212">+15558001212 (E164)</option>
                  <option value="+1 555-800-1212">
                    +1 555-800-1212 (International)
                  </option>
                  <option value="(555) 800-1212">
                    (555) 800-1212 (National)
                  </option>
                  <option value="+1-555-800-1212">
                    +1-555-800-1212 (RFC3966)
                  </option>
                  <option value="555-800-1212">
                    555-800-1212 (International, No Country Code)
                  </option>
                  <option value="+1 555 800 1212">
                    +1 555 800 1212 (International, No Hyphens)
                  </option>
                  <option value="555 800-1212">
                    555 800-1212 (National, No Parenthesis)
                  </option>
                  <option value="5558001212">
                    5558001212 (No Symbols, National)
                  </option>
                  <option value="15558001212">
                    15558001212 (No Symbols, International)
                  </option>
                </select>
                {errors.toFormat && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.toFormat.message}
                  </p>
                )}
              </div>
            </>
          );
        }
        if (transformType === 'performMathOperation') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Number value or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.input && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.input.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('operation')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Choose...</option>
                  <option value="Add">Add</option>
                  <option value="Subtract">Subtract</option>
                  <option value="Multiply">Multiply</option>
                  <option value="Divide">Divide</option>
                  <option value="Make Negative">Make Negative</option>
                </select>
                {errors.operation && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.operation.message}
                  </p>
                )}
              </div>
              {mathOperation && mathOperation !== 'Make Negative' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('operand', { valueAsNumber: true })}
                    placeholder="Number"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.operand && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.operand.message}
                    </p>
                  )}
                </div>
              )}
            </>
          );
        }
        if (transformType === 'randomNumber') {
          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lower Range <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('lowerRange', { valueAsNumber: true })}
                  placeholder="Minimum value"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.lowerRange && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.lowerRange.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upper Range <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('upperRange', { valueAsNumber: true })}
                  placeholder="Maximum value"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.upperRange && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.upperRange.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decimal Points
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="1"
                  {...register('decimalPoints', { valueAsNumber: true })}
                  placeholder="0"
                  defaultValue={0}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of decimal places (0-3, default: 0)
                </p>
                {errors.decimalPoints && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.decimalPoints.message}
                  </p>
                )}
              </div>
            </>
          );
        }
        break;

      case 'text':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input <span className="text-red-500">*</span>
              </label>
                <input
                  type="text"
                  {...register('input')}
                  onFocus={handleInputFocus}
                  placeholder={'Text value or {{placeholder}}'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              {errors.input && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.input.message}
                </p>
              )}
            </div>
            {transformType === 'replace' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('search')}
                    onFocus={handleInputFocus}
                    placeholder={'Text to search for or {{placeholder}}'}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.search && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.search.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Replace
                  </label>
                  <input
                    type="text"
                    {...register('replace')}
                    onFocus={handleInputFocus}
                    placeholder={'Replacement text or {{placeholder}}'}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.replace && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.replace.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        );
    }

    return null;
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {renderFields()}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto mb-6 border-t border-gray-200 pt-6 px-6">
        <button
          type="submit"
          disabled={!isValid}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
            isValid
              ? 'bg-neutral-800 hover:bg-neutral-900'
              : 'bg-gray-300 cursor-not-allowed text-gray-500',
          )}
        >
          Save
        </button>
      </div>
    </form>
  );
}
