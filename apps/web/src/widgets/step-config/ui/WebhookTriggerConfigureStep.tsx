'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@aflow/web/shared/lib/cn';

interface WebhookTriggerConfigureStepProps {
  webhookUrl: string;
  onSave: (config: Record<string, unknown>) => void;
}

export function WebhookTriggerConfigureStep({
  webhookUrl,
  onSave,
}: WebhookTriggerConfigureStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSave = () => {
    // Webhook triggers don't need additional config beyond the trigger ID
    // The trigger ID is already stored in the trigger object
    onSave({});
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Info Section */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              Send HTTP POST requests to the URL below to trigger this workflow.
              The request body will be passed to the workflow as the trigger
              payload. The workflow must be published and enabled for the webhook
              to work.
            </p>
          </div>

          {/* Webhook URL Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 cursor-not-allowed break-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 flex-shrink-0',
                  copied && 'border-green-500 bg-green-50 text-green-600',
                )}
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This URL is automatically generated and unique to this workflow.
              Use it to send POST requests from external services.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto mb-6 border-t border-gray-200 pt-6 px-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!webhookUrl}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
            webhookUrl
              ? 'bg-neutral-800 hover:bg-neutral-900'
              : 'bg-gray-300 cursor-not-allowed text-gray-500',
          )}
        >
          Save
        </button>
      </div>
    </div>
  );
}
