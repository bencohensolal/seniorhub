import { env } from '../../../config/env.js';
import { ConsoleEmailProvider } from './ConsoleEmailProvider.js';
import { ResendEmailProvider } from './ResendEmailProvider.js';
import { GmailSmtpProvider } from './GmailSmtpProvider.js';
import { InvitationEmailMetrics } from './InvitationEmailMetrics.js';
import { InvitationEmailQueue } from './InvitationEmailQueue.js';
import type { EmailProvider } from './types.js';

function createEmailProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'resend':
      console.info('[Email] Using Resend email provider');
      return new ResendEmailProvider({
        apiKey: env.RESEND_API_KEY!,
        from: env.EMAIL_FROM!,
      });
    case 'gmail':
      console.info('[Email] Using Gmail SMTP provider');
      return new GmailSmtpProvider({
        user: env.GMAIL_USER!,
        pass: env.GMAIL_APP_PASSWORD!,
        from: env.EMAIL_FROM!,
      });
    case 'console':
    default:
      console.info('[Email] Using Console email provider (development mode)');
      return new ConsoleEmailProvider();
  }
}

const metrics = new InvitationEmailMetrics();
const provider = createEmailProvider();
const queue = new InvitationEmailQueue(provider, metrics);

export const invitationEmailRuntime = {
  queue,
  metrics,
};
