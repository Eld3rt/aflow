import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '@aflow/workflow-core';
import { templateString } from '../template.js';

/**
 * Telegram action executor.
 * Sends messages to Telegram chat using Telegram Bot API.
 */
export class TelegramActionExecutor implements StepExecutor {
  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Extract and validate required config
    const botToken = config.botToken;
    if (!botToken || typeof botToken !== 'string') {
      throw new Error(
        'Telegram action requires a valid "botToken" in config.botToken',
      );
    }

    const chatId = config.chatId;
    if (!chatId || typeof chatId !== 'string') {
      throw new Error(
        'Telegram action requires a valid "chatId" in config.chatId',
      );
    }

    const message = config.message;
    if (!message || typeof message !== 'string') {
      throw new Error(
        'Telegram action requires a valid "message" in config.message',
      );
    }

    // Template message from execution context
    const templatedMessage = templateString(message, context);

    // Construct Telegram Bot API URL
    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    // Execute HTTP request to Telegram API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: templatedMessage,
      }),
    });

    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Telegram API request failed: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    // Parse JSON response
    const responseData = (await response.json()) as {
      ok: boolean;
      result?: {
        message_id: number;
        chat: { id: number };
        text: string;
      };
      description?: string;
    };

    // Check if Telegram API returned an error
    if (!responseData.ok) {
      throw new Error(
        `Telegram API error: ${responseData.description || 'Unknown error'}`,
      );
    }

    // Return confirmation output (will be merged into context)
    // Frontend schema expects "chatId" and "message" for user-friendly templating
    return {
      output: {
        chatId: responseData.result?.chat?.id || parseInt(chatId, 10),
        message: responseData.result?.text || templatedMessage,
      },
    };
  }
}
