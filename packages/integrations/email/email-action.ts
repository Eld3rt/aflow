import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '@aflow/workflow-core';
import { templateString } from '../template.js';
import { EmailProvider, SmtpEmailProvider } from './provider.js';

/**
 * Email action executor.
 * Sends emails during workflow execution with templated To, Subject, and Body fields.
 * Supports multiple recipients (comma-separated, up to 5) by sending emails sequentially.
 */
export class EmailActionExecutor implements StepExecutor {
  private emailProvider: EmailProvider;

  constructor(emailProvider?: EmailProvider) {
    // Use provided provider or default to SMTP
    this.emailProvider = emailProvider || new SmtpEmailProvider();
  }

  /**
   * Parse comma-separated email addresses.
   * Matches UI validation logic: split by comma, trim, filter empty.
   * @param toString - Comma-separated email addresses string
   * @returns Array of email addresses
   */
  private parseEmailAddresses(toString: string): string[] {
    return toString
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Extract and validate required config
    const to = config.to;
    if (!to || typeof to !== 'string') {
      throw new Error(
        'Email action requires a valid "to" address in config.to',
      );
    }

    const subject = config.subject;
    if (!subject || typeof subject !== 'string') {
      throw new Error(
        'Email action requires a valid "subject" in config.subject',
      );
    }

    const body = config.body;
    if (!body || typeof body !== 'string') {
      throw new Error('Email action requires a valid "body" in config.body');
    }

    // Template all fields from execution context
    const templatedTo = templateString(to, context);
    const templatedSubject = templateString(subject, context);
    const templatedBody = templateString(body, context);

    // Parse comma-separated email addresses (consistent with UI logic)
    const emailAddresses = this.parseEmailAddresses(templatedTo);

    // Validate email count (UI enforces 1-5, backend should match)
    if (emailAddresses.length === 0) {
      throw new Error('Email action requires at least one recipient address');
    }
    if (emailAddresses.length > 5) {
      throw new Error(
        'Email action supports a maximum of 5 recipient addresses',
      );
    }

    // Send emails sequentially to each recipient
    const results: Array<{
      to: string;
      messageId: string;
      success: boolean;
    }> = [];

    for (const emailAddress of emailAddresses) {
      const result = await this.emailProvider.sendEmail(
        emailAddress,
        templatedSubject,
        templatedBody,
      );
      results.push({
        to: emailAddress,
        messageId: result.messageId,
        success: result.success,
      });
    }

    // Return confirmation output (will be merged into context)
    return {
      output: {
        emailsSent: results.length,
        emails: results,
        to: templatedTo, // Keep original comma-separated string for backward compatibility
        subject: templatedSubject,
      },
    };
  }
}
