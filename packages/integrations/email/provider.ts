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

export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    const host = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.GMAIL_SMTP_PORT || '587', 10);
    const isSecurePort = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.GMAIL_SMTP_SECURE === 'true' || isSecurePort,
      requireTLS: port === 587 || process.env.GMAIL_SMTP_REQUIRE_TLS === 'true',
      auth: {
        user: process.env.GMAIL_SMTP_USER,
        pass: process.env.GMAIL_SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    from?: string,
  ): Promise<{ messageId: string; success: boolean }> {
    const fromEmail =
      from || process.env.GMAIL_FROM_EMAIL || process.env.GMAIL_SMTP_USER;

    const info = await this.transporter.sendMail({
      from: fromEmail,
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
