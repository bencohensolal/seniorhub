import type { EmailMessage, EmailProvider } from './types.js';

/**
 * Console Email Provider for development
 * 
 * Logs email content to console instead of sending real emails.
 * Useful for local development without setting up SMTP server.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (message.to.endsWith('@fail.test')) {
      throw new Error('Simulated email provider failure.');
    }

    console.info('\n' + '='.repeat(80));
    console.info('📧 INVITATION EMAIL (Development Mode - Not Actually Sent)');
    console.info('='.repeat(80));
    console.info(`To: ${message.to}`);
    console.info(`Subject: ${message.subject}`);
    console.info('-'.repeat(80));
    console.info(message.body);
    console.info('='.repeat(80) + '\n');
  }
}
