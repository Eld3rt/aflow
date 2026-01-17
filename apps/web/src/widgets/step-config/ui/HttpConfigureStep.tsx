'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@aflow/web/shared/lib/cn';
import { Plus, Trash2 } from 'lucide-react';

// Zod schema for HTTP action configuration
const httpSchema = z
  .object({
    url: z
      .string()
      .min(1, 'URL is required')
      .refine(
        (val) => {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Must be a valid URL' },
      ),
    method: z.enum(['GET', 'POST'], {
      required_error: 'HTTP method is required',
    }),
    headers: z
      .array(
        z.object({
          key: z.string().min(1, 'Header key is required'),
          value: z.string().min(1, 'Header value is required'),
        }),
      )
      .optional()
      .default([]),
    body: z.union([z.string(), z.record(z.unknown())]).optional(),
  })
  .refine(
    (data) => {
      // If method is GET, body should be undefined
      if (data.method === 'GET' && data.body !== undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'Body is not allowed for GET requests',
      path: ['body'],
    },
  );

type HttpFormData = z.infer<typeof httpSchema>;

interface HttpConfigureStepProps {
  initialValues?: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}

export function HttpConfigureStep({
  initialValues,
  onSave,
}: HttpConfigureStepProps) {
  const [bodyType, setBodyType] = useState<'string' | 'json'>('string');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<HttpFormData>({
    resolver: zodResolver(httpSchema),
    defaultValues: {
      url: (initialValues?.url as string) || '',
      method: (initialValues?.method as 'GET' | 'POST') || 'GET',
      headers: initialValues?.headers
        ? Object.entries(initialValues.headers as Record<string, string>).map(
            ([key, value]) => ({ key, value }),
          )
        : [],
      body: initialValues?.body || '',
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'headers',
  });

  const method = watch('method');
  const body = watch('body');

  // Reset form when initialValues change
  useEffect(() => {
    if (initialValues) {
      const headers = initialValues.headers
        ? Object.entries(initialValues.headers as Record<string, string>).map(
            ([key, value]) => ({ key, value }),
          )
        : [];

      // Determine body type and format
      const bodyValue = initialValues.body;
      let formattedBody: string | undefined;
      if (bodyValue) {
        if (typeof bodyValue === 'object') {
          setBodyType('json');
          formattedBody = JSON.stringify(bodyValue, null, 2);
        } else {
          setBodyType('string');
          formattedBody = String(bodyValue);
        }
      } else {
        setBodyType('string');
        formattedBody = undefined;
      }

      reset({
        url: (initialValues.url as string) || '',
        method: (initialValues.method as 'GET' | 'POST') || 'GET',
        headers,
        body: formattedBody,
      });
    }
  }, [initialValues, reset]);

  // Reset body when method changes from POST to GET
  useEffect(() => {
    if (method === 'GET') {
      const currentValues = watch();
      reset({
        ...currentValues,
        body: undefined,
      });
    }
  }, [method, reset, watch]);

  const onSubmit = (data: HttpFormData) => {
    // Convert headers array to object format expected by backend
    const headersObj: Record<string, string> = {};
    if (data.headers && data.headers.length > 0) {
      for (const header of data.headers) {
        if (header.key && header.value) {
          headersObj[header.key] = header.value;
        }
      }
    }

    // Build config object matching backend schema
    const config: Record<string, unknown> = {
      url: data.url,
      method: data.method,
    };

    // Only include headers if there are any
    if (Object.keys(headersObj).length > 0) {
      config.headers = headersObj;
    }

    // Only include body for POST requests
    if (data.method === 'POST' && data.body !== undefined && data.body !== '') {
      // If body type is JSON, try to parse it
      if (bodyType === 'json' && typeof data.body === 'string') {
        try {
          const parsed = JSON.parse(data.body);
          config.body = parsed;
        } catch {
          // If parsing fails, still include as string (backend will handle it)
          config.body = data.body;
        }
      } else {
        // For string type or if body is already an object
        config.body = data.body;
      }
    }

    onSave(config);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* URL Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              {...register('url')}
              placeholder="https://api.example.com/endpoint"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {errors.url && (
              <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>
            )}
          </div>

          {/* Method Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method <span className="text-red-500">*</span>
            </label>
            <select
              {...register('method')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            {errors.method && (
              <p className="mt-1 text-xs text-red-600">
                {errors.method.message}
              </p>
            )}
          </div>

          {/* Headers Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Headers
              </label>
              <button
                type="button"
                onClick={() => append({ key: '', value: '' })}
                className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-800"
              >
                <Plus className="h-3 w-3" />
                Add Header
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-gray-500 mb-2">
                No headers. Click "Add Header" to add custom headers.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      type="text"
                      {...register(`headers.${index}.key` as const)}
                      placeholder="Header name"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <input
                      type="text"
                      {...register(`headers.${index}.value` as const)}
                      placeholder="Header value"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove header"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.headers && (
              <p className="mt-1 text-xs text-red-600">
                {errors.headers.message}
              </p>
            )}
          </div>

          {/* Body Field (only for POST) */}
          {method === 'POST' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Body
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBodyType('string')}
                    className={cn(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      bodyType === 'string'
                        ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyType('json')}
                    className={cn(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      bodyType === 'json'
                        ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    JSON
                  </button>
                </div>
              </div>
              {bodyType === 'string' ? (
                <textarea
                  {...register('body')}
                  placeholder="Request body (plain text)"
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-y font-mono"
                />
              ) : (
                <textarea
                  {...register('body')}
                  placeholder='{"key": "value"}'
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-y font-mono"
                  onChange={(e) => {
                    // Validate JSON as user types (optional, just for UX)
                    const value = e.target.value;
                    if (value.trim()) {
                      try {
                        JSON.parse(value);
                      } catch {
                        // Invalid JSON, but we'll let zod handle validation
                      }
                    }
                  }}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">
                {bodyType === 'json'
                  ? 'Enter valid JSON. The backend will parse this as an object.'
                  : 'Plain text body. Supports templating from workflow context.'}
              </p>
              {errors.body && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.body.message}
                </p>
              )}
            </div>
          )}
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
