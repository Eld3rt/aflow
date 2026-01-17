'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@aflow/web/shared/lib/cn';

interface EmailTriggerConfigureStepProps {
  inboundEmail: string;
  onSave: (config: { inboundEmail: string }) => void;
}

export function EmailTriggerConfigureStep({
  inboundEmail,
  onSave,
}: EmailTriggerConfigureStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inboundEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSave = () => {
    onSave({ inboundEmail });
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Info Section */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              Emails sent to the address below will trigger this workflow. Share
              this address with services or users who should be able to trigger
              the workflow via email.
            </p>
          </div>

          {/* Inbound Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inbound Email Address <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inboundEmail}
                readOnly
                className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900',
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
              This address is automatically generated and unique to this
              workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto mb-6 border-t border-gray-200 pt-6 px-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!inboundEmail}
          className={cn(
            'w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
            inboundEmail
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
