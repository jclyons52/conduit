// Email service interface and implementation
export interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}

export class SMTPEmailService implements EmailService {
  constructor(
    private apiKey: string,
    private fromEmail: string
  ) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`Sending email via SMTP API (${this.apiKey})`);
    console.log(`From: ${this.fromEmail}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = `Welcome ${name}!`;
    const body = `Hello ${name}, welcome to our platform!`;
    await this.sendEmail(email, subject, body);
  }
}

export class SendGridEmailService implements EmailService {
  constructor(private apiKey: string) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`Sending email via SendGrid API (${this.apiKey})`);
    console.log(`To: ${to}, Subject: ${subject}`);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail(email, `Welcome ${name}!`, `Hello ${name}!`);
  }
}
