import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email provider interface.
 * Abstracts email sending behind a provider-agnostic interface.
 */
export interface EmailProvider {
  /**
   * Send an email.
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (plain text)
   * @returns Promise resolving to message ID or delivery confirmation
   */
  sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ messageId: string; success: boolean }>;
}

/**
 * SMTP email provider implementation using nodemailer.
 * Configured via environment variables:
 * - SMTP_HOST (default: localhost)
 * - SMTP_PORT (default: 587)
 * - SMTP_USER (optional, for authentication)
 * - SMTP_PASS (optional, for authentication)
 * - SMTP_FROM (default: noreply@localhost)
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'noreply@localhost';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: user && pass ? { user, pass } : undefined,
      // Default from address
      from,
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ messageId: string; success: boolean }> {
    const from = process.env.SMTP_FROM || 'noreply@localhost';

    const info = await this.transporter.sendMail({
      from,
      to,
      subject,
      text: body, // Plain text body
    });

    return {
      messageId: info.messageId,
      success: true,
    };
  }
}
