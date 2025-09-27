import { ILogger } from './logger';
import { UserRepository } from './user-repository';
import { EmailService } from './email';
import { AuthService } from './auth';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  PaginationQuery,
  AuthTokens,
  LoginRequest,
  AuthenticatedUser,
} from '../types/api';

class UserService {
  constructor(
    private logger: ILogger,
    private userRepository: UserRepository,
    private emailService: EmailService,
    private authService: AuthService
  ) {
    this.logger.info('UserService initialized');
  }

  async getUserById(id: string): Promise<User | null> {
    this.logger.info('Getting user by ID', { userId: id });
    return await this.userRepository.findById(id);
  }

  async getAllUsers(
    pagination?: PaginationQuery
  ): Promise<{ users: User[]; total: number }> {
    this.logger.info('Getting all users', pagination);
    return await this.userRepository.findAll(pagination);
  }

  async updateUser(
    id: string,
    userData: UpdateUserRequest
  ): Promise<User | null> {
    this.logger.info('Updating user', { userId: id });
    return await this.userRepository.update(id, userData);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info('Deleting user', { userId: id });
    await this.userRepository.delete(id);
  }

  async registerUser(
    userData: CreateUserRequest
  ): Promise<{ user: User; tokens: AuthTokens }> {
    this.logger.info('Registering new user', { email: userData.email });

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(userData.password);

    // Generate email verification token
    const emailVerificationToken =
      this.authService.generateEmailVerificationToken();

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
      emailVerificationToken,
    });

    // Generate auth tokens
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    const tokens = await this.authService.generateTokens(authenticatedUser);

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.firstName,
        emailVerificationToken
      );
    } catch (error) {
      this.logger.error('Failed to send welcome email', {
        userId: user.id,
        error: (error as Error).message,
      });
    }

    this.logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    return { user, tokens };
  }

  async loginUser(
    loginData: LoginRequest
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    this.logger.info('User login attempt', { email: loginData.email });

    // Find user
    const userResult = await this.userRepository.findByEmail(loginData.email);
    if (!userResult) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!userResult.isActive) {
      throw new Error('Account is deactivated');
    }

    // Get password hash for verification
    const passwordHash = await this.userRepository.getPasswordHashByEmail(
      loginData.email.toLowerCase()
    );
    if (!passwordHash) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.authService.verifyPassword(
      loginData.password,
      passwordHash
    );
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Create authenticated user object
    const user: AuthenticatedUser = {
      id: userResult.id,
      email: userResult.email,
      firstName: userResult.firstName,
      lastName: userResult.lastName,
      role: userResult.role,
    };

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    this.logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return { user, tokens };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    this.logger.info('Refreshing token');

    const user = await this.authService.verifyRefreshToken(refreshToken);
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old refresh token
    await this.authService.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const tokens = await this.authService.generateTokens(user);

    this.logger.info('Token refreshed successfully', { userId: user.id });

    return tokens;
  }

  async logoutUser(refreshToken: string): Promise<void> {
    this.logger.info('User logout');

    await this.authService.revokeRefreshToken(refreshToken);

    this.logger.info('User logged out successfully');
  }

  async verifyEmail(token: string): Promise<User | null> {
    this.logger.info('Verifying email with token');

    const user = await this.userRepository.findByEmailVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      this.logger.info('Email already verified', { userId: user.id });
      return user;
    }

    await this.userRepository.setEmailVerified(user.id, true);

    const updatedUser = await this.userRepository.findById(user.id);

    this.logger.info('Email verified successfully', { userId: user.id });

    return updatedUser;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    this.logger.info('Resending verification email', { email });

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      this.logger.info('Verification email resend completed (user not found)', {
        email,
      });
      return;
    }

    if (user.emailVerified) {
      this.logger.info('Email already verified, skipping resend', {
        userId: user.id,
      });
      return;
    }

    // Generate new verification token
    const verificationToken = this.authService.generateEmailVerificationToken();

    // Update user with new token
    await this.userRepository.setEmailVerificationToken(
      user.id,
      verificationToken
    );

    // Send email
    await this.emailService.sendEmailVerificationEmail(
      user.email,
      user.firstName,
      verificationToken
    );

    this.logger.info('Verification email sent successfully', {
      userId: user.id,
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.logger.info('Password reset requested', { email });

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      this.logger.info('Password reset request completed (user not found)', {
        email,
      });
      return;
    }

    // Generate reset token
    const resetToken = this.authService.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.userRepository.setPasswordResetToken(
      email,
      resetToken,
      expiresAt
    );

    // Send email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken
    );

    this.logger.info('Password reset email sent successfully', {
      userId: user.id,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.info('Resetting password with token');

    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.authService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePasswordById(user.id, passwordHash);

    // Clear reset token
    await this.userRepository.clearPasswordResetToken(user.id);

    // Send notification email
    await this.emailService.sendPasswordChangeNotification(
      user.email,
      user.firstName
    );

    this.logger.info('Password reset successfully', { userId: user.id });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    this.logger.info('Changing password', { userId });

    // Get current password hash
    const currentPasswordHash =
      await this.userRepository.getPasswordHashById(userId);
    if (!currentPasswordHash) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.authService.verifyPassword(
      currentPassword,
      currentPasswordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.authService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePasswordById(userId, newPasswordHash);

    // Get user for notification
    const user = await this.userRepository.findById(userId);
    if (user) {
      await this.emailService.sendPasswordChangeNotification(
        user.email,
        user.firstName
      );
    }

    this.logger.info('Password changed successfully', { userId });
  }
}

export { UserService };
