'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@aflow/web/shared/lib/cn';

const emailSchema = z
  .object({
    to: z
      .string()
      .min(1, 'To field is required')
      .refine(
        (val) => {
          // Split by comma, trim, filter empty
          const emails = val
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
          // Check count limit
          if (emails.length === 0) return false;
          if (emails.length > 5) return false;
          // Validate each email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emails.every((email) => emailRegex.test(email));
        },
        {
          message: 'Must be 1-5 valid email addresses separated by commas',
        },
      ),
    subject: z
      .string()
      .min(1, 'Subject is required')
      .max(255, 'Subject cannot exceed 255 characters'),
    body: z.string().min(1, 'Body is required'),
  })
  .transform((data) => {
    // Normalize 'to' field: split, trim, join with comma
    const emails = data.to
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    return {
      ...data,
      to: emails.join(', '), // Join with comma-space for consistent format
    };
  });

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailConfigureStepProps {
  initialValues?: Partial<EmailFormData>;
  onSave: (config: { to: string; subject: string; body: string }) => void;
}

export function EmailConfigureStep({
  initialValues,
  onSave,
}: EmailConfigureStepProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: initialValues?.to || '',
      subject: initialValues?.subject || '',
      body: initialValues?.body || '',
    },
    mode: 'onChange',
  });

  // Reset form when initialValues change (e.g., when reopening with saved config)
  useEffect(() => {
    if (initialValues) {
      reset({
        to: initialValues.to || '',
        subject: initialValues.subject || '',
        body: initialValues.body || '',
      });
    }
  }, [initialValues, reset]);

  const onSubmit = (data: EmailFormData) => {
    // Data is already transformed by Zod schema
    onSave({
      to: data.to,
      subject: data.subject,
      body: data.body,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Recipient email addresses"
              >
                ⓘ
              </span>
            </label>
            <input
              type="text"
              {...register('to')}
              placeholder="user@example.com, another@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can enter multiple email addresses separated by commas.
              Limited to 5.
            </p>
            {errors.to && (
              <p className="mt-1 text-xs text-red-600">{errors.to.message}</p>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Email subject line"
              >
                ⓘ
              </span>
            </label>
            <input
              type="text"
              {...register('subject')}
              placeholder="Enter email subject"
              maxLength={255}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-600">
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Email body content"
              >
                ⓘ
              </span>
            </label>
            <textarea
              {...register('body')}
              placeholder="Enter email body (plain text or HTML)"
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              Plain text or HTML supported
            </p>
            {errors.body && (
              <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>
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
