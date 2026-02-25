import type { EmailMessage, EmailProvider } from './types.js';

/**
 * MailDev Email Provider for local development
 * 
 * Sends emails to MailDev (http://maildev.github.io/maildev/) which is a
 * SMTP server with a web UI for viewing emails during development.
 * 
 * Setup:
 * 1. Install MailDev: npm install -g maildev
 * 2. Run MailDev: maildev
 * 3. Open UI: http://localhost:1080
 * 4. Emails sent to localhost:1025 will appear in the UI
 */
export class MailDevEmailProvider implements EmailProvider {
  private readonly smtpHost: string;
  private readonly smtpPort: number;

  constructor(config?: { host?: string; port?: number }) {
    this.smtpHost = config?.host ?? 'localhost';
    this.smtpPort = config?.port ?? 1025;
  }

  async send(message: EmailMessage): Promise<void> {
    // Pour l'instant, on simule l'envoi
    // À terme, on pourra utiliser nodemailer pour envoyer via SMTP
    console.info(`[MailDev] Email would be sent to ${message.to} via ${this.smtpHost}:${this.smtpPort}`);
    console.info(`[MailDev] Subject: ${message.subject}`);
    console.info(`[MailDev] Body preview: ${message.body.substring(0, 100)}...`);
    
    // TODO: Implémenter l'envoi réel avec nodemailer si besoin
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: this.smtpHost,
    //   port: this.smtpPort,
    //   ignoreTLS: true,
    // });
    // await transporter.sendMail({
    //   from: 'noreply@seniorhub.app',
    //   to: message.to,
    //   subject: message.subject,
    //   html: message.body,
    // });
  }
}
