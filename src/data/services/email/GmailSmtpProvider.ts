import nodemailer from 'nodemailer';
import type { EmailMessage, EmailProvider } from './types.js';

/**
 * Gmail SMTP Email Provider
 * 
 * Sends real emails using Gmail's SMTP server.
 * Requires a Gmail account and an App Password.
 * 
 * Setup:
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Generate an App Password for "Mail"
 * 3. Use your Gmail address and the generated password
 * 
 * Limits: 500 emails/day (free)
 * Cost: Free
 */
export class GmailSmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(config: { user: string; pass: string; from: string }) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    // Verify connection on startup
    this.transporter.verify((error: Error | null) => {
      if (error) {
        console.error('[GmailSmtpProvider] SMTP connection failed:', error.message);
      } else {
        console.info('[GmailSmtpProvider] SMTP connection verified successfully');
      }
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Senior Hub <noreply@seniorhub.app>',
        to: message.to,
        subject: message.subject,
        text: message.body,
      });

      console.info('[GmailSmtpProvider] Email sent successfully:', {
        messageId: info.messageId,
        to: message.to,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GmailSmtpProvider] Failed to send email:', {
        to: message.to,
        error: errorMessage,
      });
      throw new Error(`Failed to send email via Gmail SMTP: ${errorMessage}`);
    }
  }
}
