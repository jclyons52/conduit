import { UserService } from './user-service';
import { Logger } from './logger';

// Notification service interface and implementation
export interface NotificationService {
  sendUserNotification(userId: string, message: string): Promise<void>;
  sendWelcomeNotification(userId: string): Promise<void>;
  sendPasswordResetNotification(email: string): Promise<void>;
}

export class NotificationServiceImpl implements NotificationService {
  constructor(
    private userService: UserService,
    private logger: Logger
  ) {}

  async sendUserNotification(userId: string, message: string): Promise<void> {
    this.logger.info(`Sending notification to user ${userId}: ${message}`);

    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // In real implementation, would send via push notification service
    console.log(`📱 Notification to ${user.email}: ${message}`);
  }

  async sendWelcomeNotification(userId: string): Promise<void> {
    const message =
      'Welcome to our platform! Your account has been created successfully.';
    await this.sendUserNotification(userId, message);
  }

  async sendPasswordResetNotification(email: string): Promise<void> {
    this.logger.info(`Sending password reset notification to ${email}`);

    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      this.logger.info(
        `Password reset requested for non-existent email: ${email}`
      );
      return;
    }

    const message =
      'A password reset has been requested for your account. Click the link to reset your password.';
    await this.sendUserNotification(user.id, message);
  }
}
