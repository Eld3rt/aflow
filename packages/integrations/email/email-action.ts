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
 */
export class EmailActionExecutor implements StepExecutor {
  private emailProvider: EmailProvider;

  constructor(emailProvider?: EmailProvider) {
    // Use provided provider or default to SMTP
    this.emailProvider = emailProvider || new SmtpEmailProvider();
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

    // Send email
    const result = await this.emailProvider.sendEmail(
      templatedTo,
      templatedSubject,
      templatedBody,
    );

    // Return confirmation output (will be merged into context)
    return {
      output: {
        emailSent: true,
        messageId: result.messageId,
        to: templatedTo,
        subject: templatedSubject,
      },
    };
  }
}
