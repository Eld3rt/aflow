'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { useEffect } from 'react';

interface ConfigFormData {
  type: string;
  [key: string]: unknown;
}

export function ConfigPanel() {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeType = useEditorStore((state) => state.selectedNodeType);
  const trigger = useEditorStore((state) => state.trigger);
  const actions = useEditorStore((state) => state.actions);
  const updateAction = useEditorStore((state) => state.updateAction);
  const setTrigger = useEditorStore((state) => state.setTrigger);
  const closeConfigPanel = useEditorStore((state) => state.closeConfigPanel);

  const selectedNode =
    selectedNodeType === 'trigger'
      ? trigger
      : actions.find((a) => a.id === selectedNodeId);

  const { register, handleSubmit, reset, watch } = useForm<ConfigFormData>({
    defaultValues: selectedNode
      ? {
          type: selectedNode.type,
          ...selectedNode.config,
        }
      : {},
  });

  useEffect(() => {
    if (selectedNode) {
      reset({
        type: selectedNode.type,
        ...selectedNode.config,
      });
    } else if (selectedNodeType === 'trigger') {
      // New trigger - reset to empty form
      reset({
        type: 'webhook',
        ...{},
      });
    } else {
      reset({});
    }
  }, [selectedNode, selectedNodeType, reset]);

  const onSubmit = (data: ConfigFormData) => {
    if (!selectedNodeId || !selectedNodeType) return;

    const { type, ...config } = data;

    if (selectedNodeType === 'trigger') {
      setTrigger({
        id: trigger?.id || `trigger-${Date.now()}`,
        type,
        config,
      });
    } else if (selectedNodeType === 'action') {
      updateAction(selectedNodeId, {
        type,
        config,
      });
    }
  };

  if (!selectedNodeId || !selectedNodeType) {
    return null;
  }

  const nodeTitle = selectedNodeType === 'trigger' ? 'Trigger' : 'Action';

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-gray-200 bg-white shadow-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{nodeTitle}</h2>
          <button
            onClick={closeConfigPanel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  {...register('type', { required: true })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                >
                  {selectedNodeType === 'trigger' ? (
                    <>
                      <option value="webhook">Webhook</option>
                      <option value="schedule">Schedule</option>
                      <option value="manual">Manual</option>
                    </>
                  ) : (
                    <>
                      <option value="http">HTTP Request</option>
                      <option value="email">Send Email</option>
                      <option value="database">Database Action</option>
                      <option value="telegram">Telegram Message</option>
                    </>
                  )}
                </select>
              </div>

              {selectedNodeType === 'trigger' &&
                watch('type') === 'webhook' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL
                    </label>
                    <input
                      type="text"
                      {...register('url')}
                      placeholder="https://api.example.com/webhook"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                    />
                  </div>
                )}

              {selectedNodeType === 'trigger' &&
                watch('type') === 'schedule' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schedule (Cron)
                      </label>
                      <input
                        type="text"
                        {...register('cron')}
                        placeholder="0 0 * * *"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Cron expression (e.g., "0 0 * * *" for daily at midnight)
                    </p>
                  </>
                )}

              {watch('type') === 'http' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      {...register('url')}
                      placeholder="https://api.example.com/endpoint"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Method
                    </label>
                    <select
                      {...register('method')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                </>
              )}

              {watch('type') === 'email' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To
                    </label>
                    <input
                      type="email"
                      {...register('to')}
                      placeholder="recipient@example.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      {...register('subject')}
                      placeholder="Email subject"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                    />
                  </div>
                </>
              )}

              {watch('type') === 'database' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query
                  </label>
                  <textarea
                    {...register('query')}
                    placeholder="SELECT * FROM users WHERE id = ?"
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                  />
                </div>
              )}

              {watch('type') === 'telegram' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    {...register('message')}
                    placeholder="Telegram message text"
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
