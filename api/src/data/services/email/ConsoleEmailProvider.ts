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

    console.log('\n' + '='.repeat(80));
    console.log('📧 INVITATION EMAIL (Development Mode - Not Actually Sent)');
    console.log('='.repeat(80));
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log('-'.repeat(80));
    console.log(message.body);
    console.log('='.repeat(80) + '\n');
  }
}
