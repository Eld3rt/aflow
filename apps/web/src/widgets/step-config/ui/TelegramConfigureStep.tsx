'use client';

import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@aflow/web/shared/lib/cn';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { useTemplateInsertion } from '../hooks/useTemplateInsertion';

const telegramSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  message: z.string().min(1, 'Message is required'),
});

type TelegramFormData = z.infer<typeof telegramSchema>;

interface TelegramConfigureStepProps {
  initialValues?: Partial<TelegramFormData>;
  onSave: (config: { botToken: string; chatId: string; message: string }) => void;
}

export function TelegramConfigureStep({
  initialValues,
  onSave,
}: TelegramConfigureStepProps) {
  const trigger = useEditorStore((state) => state.trigger);
  const actions = useEditorStore((state) => state.actions);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);

  const currentStep = actions.find((a) => a.id === selectedNodeId);
  const currentStepOrder = currentStep?.order ?? null;

  const { insertTemplate } = useTemplateInsertion();

  // Track the last focused input/textarea element
  const lastFocusedElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<TelegramFormData>({
    resolver: zodResolver(telegramSchema),
    defaultValues: {
      botToken: initialValues?.botToken || '',
      chatId: initialValues?.chatId || '',
      message: initialValues?.message || '',
    },
    mode: 'onChange',
  });

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

  const onSubmit = (data: TelegramFormData) => {
    onSave({
      botToken: data.botToken,
      chatId: data.chatId,
      message: data.message,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Bot Token Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bot Token <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Telegram Bot API token"
              >
                ⓘ
              </span>
            </label>
            <input
              type="password"
              {...register('botToken')}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your Telegram Bot API token from @BotFather
            </p>
            {errors.botToken && (
              <p className="mt-1 text-xs text-red-600">
                {errors.botToken.message}
              </p>
            )}
          </div>

          {/* Chat ID Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chat ID <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Telegram chat or channel ID"
              >
                ⓘ
              </span>
            </label>
            <input
              type="text"
              {...register('chatId')}
              placeholder="-1001234567890 or 123456789"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              The chat ID where the message will be sent (user, group, or channel)
            </p>
            {errors.chatId && (
              <p className="mt-1 text-xs text-red-600">
                {errors.chatId.message}
              </p>
            )}
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Message text (supports templating from workflow context)"
              >
                ⓘ
              </span>
            </label>
            <textarea
              {...register('message')}
              onFocus={handleInputFocus}
              placeholder={'Hello {{from}}, you have a new message: {{subject}}'}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              Message text. Use placeholders from Available Data panel. Values
              will be resolved when the workflow runs.
            </p>
            {errors.message && (
              <p className="mt-1 text-xs text-red-600">
                {errors.message.message}
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
