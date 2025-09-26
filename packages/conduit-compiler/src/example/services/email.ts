export class EmailService {
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
