import { Logger } from './logger';
import { UserRepository } from './user-repository';
import { EmailService } from './email';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<any> {
    this.logger.info(`UserService: Getting user ${id}`);
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<any> {
    this.logger.info(`UserService: Getting user by email ${email}`);
    return this.userRepository.findByEmail(email);
  }

  async createUser(userData: any): Promise<any> {
    this.logger.info(`UserService: Creating user ${userData.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error(`User with email ${userData.email} already exists`);
    }

    // Create the user
    const user = await this.userRepository.create(userData);

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error}`);
      // Don't fail user creation if email fails
    }

    return user;
  }

  async updateUser(id: string, userData: any): Promise<any> {
    this.logger.info(`UserService: Updating user ${id}`);
    return this.userRepository.update(id, userData);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info(`UserService: Deleting user ${id}`);
    await this.userRepository.delete(id);
  }
}
