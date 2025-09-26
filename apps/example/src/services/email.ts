import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { config } from '../config/environment';
import { ILogger } from './logger';
import { EmailTemplate, EmailContext } from '../types/api';

export interface IEmailService {
  sendEmail(to: string, template: EmailTemplate, context?: EmailContext): Promise<void>;
  sendWelcomeEmail(to: string, firstName: string, verificationToken: string): Promise<void>;
  sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<void>;
  sendEmailVerificationEmail(to: string, firstName: string, verificationToken: string): Promise<void>;
  sendPasswordChangeNotification(to: string, firstName: string): Promise<void>;
}

class EmailService implements IEmailService {
  private transporter: Transporter;

  constructor(private logger: ILogger) {
    this.transporter = nodemailer.createTransporter({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.port === 465,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.info('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection verification failed', { error: (error as Error).message });
    }
  }

  private replaceTemplate(template: string, context: EmailContext): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  async sendEmail(to: string, template: EmailTemplate, context: EmailContext = {}): Promise<void> {
    try {
      const subject = this.replaceTemplate(template.subject, context);
      const html = this.replaceTemplate(template.html, context);
      const text = this.replaceTemplate(template.text, context);

      const mailOptions: SendMailOptions = {
        from: config.email.from,
        to,
        subject,
        html,
        text,
      };

      this.logger.info('Sending email', { to, subject });

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });
    } catch (error) {
      this.logger.error('Failed to send email', {
        to,
        subject: template.subject,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${config.nodeEnv === 'production' ? 'https://yourapp.com' : 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;

    const template: EmailTemplate = {
      subject: 'Welcome to Conduit Example API! Please verify your email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Conduit Example API, {{firstName}}!</h2>
          <p>Thank you for joining us. To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
          <p>This verification link will expire in 24 hours.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with us, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Welcome to Conduit Example API, {{firstName}}!

        Thank you for joining us. To complete your registration, please verify your email address by visiting:
        {{verificationUrl}}

        This verification link will expire in 24 hours.

        If you didn't create an account with us, please ignore this email.
      `
    };

    await this.sendEmail(to, template, { firstName, verificationUrl });
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.nodeEnv === 'production' ? 'https://yourapp.com' : 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const template: EmailTemplate = {
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello {{firstName}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
          <p>This reset link will expire in 1 hour.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
      text: `
        Password Reset Request

        Hello {{firstName}},

        We received a request to reset your password. Visit this link to create a new password:
        {{resetUrl}}

        This reset link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email.
      `
    };

    await this.sendEmail(to, template, { firstName, resetUrl });
  }

  async sendEmailVerificationEmail(to: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${config.nodeEnv === 'production' ? 'https://yourapp.com' : 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;

    const template: EmailTemplate = {
      subject: 'Please verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello {{firstName}},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
        </div>
      `,
      text: `
        Hello {{firstName}},

        Please verify your email address by visiting:
        {{verificationUrl}}
      `
    };

    await this.sendEmail(to, template, { firstName, verificationUrl });
  }

  async sendPasswordChangeNotification(to: string, firstName: string): Promise<void> {
    const template: EmailTemplate = {
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed</h2>
          <p>Hello {{firstName}},</p>
          <p>This is a confirmation that your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Hello {{firstName}},

        This is a confirmation that your password has been successfully changed.

        If you didn't make this change, please contact our support team immediately.
      `
    };

    await this.sendEmail(to, template, { firstName });
  }
}

export { EmailService };