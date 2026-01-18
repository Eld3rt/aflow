'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@aflow/web/shared/lib/cn';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { useTemplateInsertion } from '../hooks/useTemplateInsertion';

interface DatabaseConfigureStepProps {
  databaseType: 'postgres' | 'mysql';
  initialValues?: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}

// Zod schema for database action configuration
const getSchema = (operation: string) => {
  const baseSchema = z.object({
    connection: z.object({
      host: z.string().min(1, 'Host is required'),
      port: z
        .number()
        .int('Port must be an integer')
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must be at most 65535'),
      database: z.string().min(1, 'Database name is required'),
      user: z.string().min(1, 'User is required'),
      password: z.string().min(1, 'Password is required'),
    }),
    table: z.string().min(1, 'Table name is required'),
    operation: z.enum(['insert', 'update', 'select']),
  });

  if (operation === 'insert') {
    return baseSchema.extend({
      data: z
        .record(z.string(), z.unknown())
        .refine((val) => Object.keys(val).length > 0, {
          message: 'Data is required for insert operation',
        }),
    });
  }

  if (operation === 'update') {
    return baseSchema.extend({
      data: z
        .record(z.string(), z.unknown())
        .refine((val) => Object.keys(val).length > 0, {
          message: 'Data is required for update operation',
        }),
      where: z
        .record(z.string(), z.unknown())
        .refine((val) => Object.keys(val).length > 0, {
          message: 'Where clause is required for update operation',
        }),
    });
  }

  // select operation
  return baseSchema.extend({
    where: z.record(z.string(), z.unknown()).optional(),
  });
};

type DatabaseFormData = z.infer<ReturnType<typeof getSchema>>;

export function DatabaseConfigureStep({
  databaseType,
  initialValues,
  onSave,
}: DatabaseConfigureStepProps) {
  const [dataFields, setDataFields] = useState<Array<{ key: string; value: string }>>([]);
  const [whereFields, setWhereFields] = useState<Array<{ key: string; value: string }>>([]);

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

  // Initialize form with default schema (will update when operation changes)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<DatabaseFormData>({
    resolver: zodResolver(getSchema('select')), // Default to select
    defaultValues: {
      connection: {
        host: (initialValues?.connection as Record<string, unknown>)?.host as string || '',
        port: (initialValues?.connection as Record<string, unknown>)?.port as number || 5432,
        database: (initialValues?.connection as Record<string, unknown>)?.database as string || '',
        user: (initialValues?.connection as Record<string, unknown>)?.user as string || '',
        password: (initialValues?.connection as Record<string, unknown>)?.password as string || '',
      },
      table: (initialValues?.table as string) || '',
      operation: (initialValues?.operation as 'insert' | 'update' | 'select') || 'select',
    },
    mode: 'onChange',
  });

  const operation = watch('operation');

  // Initialize data and where fields from initialValues
  useEffect(() => {
    if (initialValues) {
      const data = initialValues.data as Record<string, unknown> | undefined;
      if (data) {
        setDataFields(
          Object.entries(data).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        );
      }

      const where = initialValues.where as Record<string, unknown> | undefined;
      if (where) {
        setWhereFields(
          Object.entries(where).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        );
      }
    }
  }, [initialValues]);

  const addDataField = () => {
    setDataFields([...dataFields, { key: '', value: '' }]);
  };

  const removeDataField = (index: number) => {
    setDataFields(dataFields.filter((_, i) => i !== index));
  };

  const updateDataField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...dataFields];
    const currentField = updated[index];
    if (currentField) {
      updated[index] = { key: currentField.key, value: currentField.value, [field]: value };
    }
    setDataFields(updated);
  };

  const addWhereField = () => {
    setWhereFields([...whereFields, { key: '', value: '' }]);
  };

  const removeWhereField = (index: number) => {
    setWhereFields(whereFields.filter((_, i) => i !== index));
  };

  const updateWhereField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...whereFields];
    const currentField = updated[index];
    if (currentField) {
      updated[index] = { key: currentField.key, value: currentField.value, [field]: value };
    }
    setWhereFields(updated);
  };

  const parseFieldValue = (value: string): unknown => {
    // Try to parse value as number or boolean, otherwise keep as string
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    return value;
  };

  const onSubmit = (data: DatabaseFormData) => {
    // Build data object from fields
    const dataObj = dataFields.reduce((acc, field) => {
      if (field.key && field.value) {
        acc[field.key] = parseFieldValue(field.value);
      }
      return acc;
    }, {} as Record<string, unknown>);

    // Build where object from fields
    const whereObj = whereFields.reduce((acc, field) => {
      if (field.key && field.value) {
        acc[field.key] = parseFieldValue(field.value);
      }
      return acc;
    }, {} as Record<string, unknown>);

    // Validate operation-specific requirements
    if (data.operation === 'insert' && Object.keys(dataObj).length === 0) {
      // Error will be shown by isFormValid check
      return;
    }
    if (data.operation === 'update') {
      if (Object.keys(dataObj).length === 0 || Object.keys(whereObj).length === 0) {
        // Error will be shown by isFormValid check
        return;
      }
    }

    // Build config object matching backend schema
    const config: Record<string, unknown> = {
      databaseType,
      connection: data.connection,
      table: data.table,
      operation: data.operation,
    };

    // Add data if present
    if (Object.keys(dataObj).length > 0) {
      config.data = dataObj;
    }

    // Add where if present
    if (Object.keys(whereObj).length > 0) {
      config.where = whereObj;
    }

    onSave(config);
  };

  // Manual validation for operation-specific fields
  const isFormValid = () => {
    if (!isValid) return false;

    // Check operation-specific requirements
    if (operation === 'insert') {
      const hasData = dataFields.some((f) => f.key && f.value);
      if (!hasData) return false;
    }

    if (operation === 'update') {
      const hasData = dataFields.some((f) => f.key && f.value);
      const hasWhere = whereFields.some((f) => f.key && f.value);
      if (!hasData || !hasWhere) return false;
    }

    return true;
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Connection Section */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Connection
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('connection.host')}
                  placeholder="localhost"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.connection?.host && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.connection.host.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('connection.port', { valueAsNumber: true })}
                  placeholder={databaseType === 'postgres' ? '5432' : '3306'}
                  min="1"
                  max="65535"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.connection?.port && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.connection.port.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('connection.database')}
                  placeholder="database_name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.connection?.database && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.connection.database.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('connection.user')}
                  placeholder="username"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.connection?.user && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.connection.user.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  {...register('connection.password')}
                  placeholder="password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {errors.connection?.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.connection.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Table Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Table <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('table')}
              placeholder="table_name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {errors.table && (
              <p className="mt-1 text-xs text-red-600">{errors.table.message}</p>
            )}
          </div>

          {/* Operation Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operation <span className="text-red-500">*</span>
            </label>
            <select
              {...register('operation')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="select">Select</option>
              <option value="insert">Insert</option>
              <option value="update">Update</option>
            </select>
            {errors.operation && (
              <p className="mt-1 text-xs text-red-600">
                {errors.operation.message}
              </p>
            )}
          </div>

          {/* Data Fields (for insert and update) */}
          {(operation === 'insert' || operation === 'update') && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Data <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addDataField}
                  className="text-xs text-neutral-600 hover:text-neutral-800"
                >
                  + Add Field
                </button>
              </div>
              {dataFields.length === 0 ? (
                <p className="text-xs text-gray-500 mb-2">
                  No data fields. Click "Add Field" to add column-value pairs.
                </p>
              ) : (
                <div className="space-y-2">
                  {dataFields.map((field, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) =>
                          updateDataField(index, 'key', e.target.value)
                        }
                        placeholder="Column name"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          updateDataField(index, 'value', e.target.value)
                        }
                        onFocus={handleInputFocus}
                        placeholder={'Value or {{placeholder}}'}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => removeDataField(index)}
                        className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove field"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(operation === 'insert' || operation === 'update') &&
                dataFields.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    At least one data field is required for {operation} operation
                  </p>
                )}
            </div>
          )}

          {/* Where Fields (for update and select) */}
          {(operation === 'update' || operation === 'select') && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Where {operation === 'update' && <span className="text-red-500">*</span>}
                </label>
                <button
                  type="button"
                  onClick={addWhereField}
                  className="text-xs text-neutral-600 hover:text-neutral-800"
                >
                  + Add Field
                </button>
              </div>
              {whereFields.length === 0 ? (
                <p className="text-xs text-gray-500 mb-2">
                  {operation === 'update'
                    ? 'No where fields. Click "Add Field" to add condition column-value pairs.'
                    : 'No where fields. Click "Add Field" to add optional condition column-value pairs.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {whereFields.map((field, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) =>
                          updateWhereField(index, 'key', e.target.value)
                        }
                        placeholder="Column name"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          updateWhereField(index, 'value', e.target.value)
                        }
                        onFocus={handleInputFocus}
                        placeholder={'Value or {{placeholder}}'}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => removeWhereField(index)}
                        className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove field"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {operation === 'update' && whereFields.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  At least one where field is required for update operation
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
          disabled={!isFormValid()}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
            isFormValid()
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
