'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  generateCronExpression,
  type FrequencyType,
} from '@aflow/web/shared/lib/cron-generator';
import { cn } from '@aflow/web/shared/lib/cn';

const scheduleSchema = z
  .object({
    frequencyType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    interval: z.number().int().positive().min(1),
    startDate: z
      .string()
      .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format'),
    timeOfDay: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Time must be in HH:mm format (24-hour)',
      ),
  })
  .refine(
    (data) => {
      // Validate date is actually valid
      const dateParts = data.startDate.split('-').map(Number);
      if (dateParts.length !== 3) return false;
      const [day, month, year] = dateParts;
      if (!day || !month || !year) return false;
      const date = new Date(year, month - 1, day);
      return (
        date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year
      );
    },
    {
      message: 'Start date must be a valid date',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      if (data.frequencyType === 'hourly' && data.interval > 23) {
        return false;
      }
      return true;
    },
    {
      message: 'Hourly interval cannot exceed 23 hours',
      path: ['interval'],
    },
  )
  .refine(
    (data) => {
      if (data.frequencyType === 'monthly' && data.interval > 12) {
        return false;
      }
      return true;
    },
    {
      message: 'Monthly interval cannot exceed 12 months',
      path: ['interval'],
    },
  );

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleConfigureStepProps {
  initialValues?: Partial<ScheduleFormData>;
  onSave: (config: {
    cronExpression: string;
    scheduleConfig: ScheduleFormData;
  }) => void;
}

const FREQUENCY_OPTIONS: Array<{ value: FrequencyType; label: string }> = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function ScheduleConfigureStep({
  initialValues,
  onSave,
}: ScheduleConfigureStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      frequencyType: initialValues?.frequencyType || 'daily',
      interval: initialValues?.interval || 1,
      startDate: initialValues?.startDate || '',
      timeOfDay: initialValues?.timeOfDay || '',
    },
    mode: 'onChange',
  });

  // Reset form when initialValues change (e.g., when reopening with saved config)
  useEffect(() => {
    if (initialValues) {
      reset({
        frequencyType: initialValues.frequencyType || 'daily',
        interval: initialValues.interval || 1,
        startDate: initialValues.startDate || '',
        timeOfDay: initialValues.timeOfDay || '',
      });
    }
  }, [initialValues, reset]);

  const frequencyType = watch('frequencyType');
  const interval = watch('interval');

  const getIntervalLabel = () => {
    switch (frequencyType) {
      case 'hourly':
        return 'Every N hours';
      case 'daily':
        return 'Every N days';
      case 'weekly':
        return 'Every N weeks';
      case 'monthly':
        return 'Every N months';
      default:
        return 'Interval';
    }
  };

  const onSubmit = (data: ScheduleFormData) => {
    try {
      const cronExpression = generateCronExpression(data);
      // Store both cronExpression (for backend) and scheduleConfig (for UI restoration)
      onSave({ cronExpression, scheduleConfig: data });
    } catch (error) {
      // This should not happen if Zod validation passes, but handle gracefully
      console.error('Failed to generate cron expression:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate schedule';
      // Form validation should prevent this, but if it happens, we can't save
      throw new Error(errorMessage);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Frequency Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency Type <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Select how often the workflow should run"
              >
                ⓘ
              </span>
            </label>
            <select
              {...register('frequencyType')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.frequencyType && (
              <p className="mt-1 text-xs text-red-600">
                {errors.frequencyType.message}
              </p>
            )}
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getIntervalLabel()}
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="How many units between each execution"
              >
                ⓘ
              </span>
            </label>
            <input
              type="number"
              {...register('interval', { valueAsNumber: true })}
              min="1"
              placeholder="123"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {errors.interval && (
              <p className="mt-1 text-xs text-red-600">
                {errors.interval.message}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="When the schedule should start"
              >
                ⓘ
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                {...register('startDate')}
                placeholder="DD-MM-YYYY"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                📅
              </span>
            </div>
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-600">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time of Day <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Time in 24-hour format (GMT+03:00)"
              >
                ⓘ
              </span>
            </label>
            <select
              {...register('timeOfDay')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Choose...</option>
              {Array.from({ length: 24 * 4 }, (_, i) => {
                const hours = Math.floor(i / 4);
                const minutes = (i % 4) * 15;
                const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                return (
                  <option key={timeString} value={timeString}>
                    {timeString}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-gray-500">Timezone: GMT+03:00</p>
            {errors.timeOfDay && (
              <p className="mt-1 text-xs text-red-600">
                {errors.timeOfDay.message}
              </p>
            )}
          </div>
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
