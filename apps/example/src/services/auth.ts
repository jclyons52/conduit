import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { ILogger } from './logger';
import { Database } from './database';
import { Cache } from './cache';
import { AuthTokens, AuthenticatedUser, UserRole } from '../types/api';

class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh:';

  constructor(
    private logger: ILogger,
    private database: Database,
    private cache: Cache
  ) {}

  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);
      this.logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      this.logger.error('Failed to hash password', {
        error: (error as Error).message,
      });
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      this.logger.debug('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify password', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  async generateTokens(user: AuthenticatedUser): Promise<AuthTokens> {
    try {
      // Generate access token
      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          type: 'access',
        },
        config.jwt.secret
        // { expiresIn: config.jwt.expiresIn }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          type: 'refresh',
          tokenId: uuidv4(),
        },
        config.jwt.secret
        // { expiresIn: config.jwt.refreshExpiresIn }
      );

      // Store refresh token hash in database
      await this.storeRefreshToken(user.id, refreshToken);

      // Cache user session data
      await this.cache.set(
        `${this.REFRESH_TOKEN_PREFIX}${user.id}`,
        { refreshToken, userId: user.id },
        7 * 24 * 60 * 60 // 7 days
      );

      this.logger.info('Tokens generated successfully', { userId: user.id });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to generate tokens', {
        userId: user.id,
        error: (error as Error).message,
      });
      throw new Error('Token generation failed');
    }
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        this.logger.warn('Attempted to use blacklisted access token');
        return null;
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'access') {
        this.logger.warn('Invalid token type for access token verification');
        return null;
      }

      return {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn('Invalid access token', { error: error.message });
      } else {
        this.logger.error('Failed to verify access token', {
          error: (error as Error).message,
        });
      }
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'refresh') {
        this.logger.warn('Invalid token type for refresh token verification');
        return null;
      }

      // Check if refresh token exists in database
      const isValid = await this.isRefreshTokenValid(decoded.id, token);
      if (!isValid) {
        this.logger.warn('Refresh token not found in database', {
          userId: decoded.id,
        });
        return null;
      }

      // Get full user data from database
      const userResult = await this.database.query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        this.logger.warn('User not found for refresh token', {
          userId: decoded.id,
        });
        return null;
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        this.logger.warn('Inactive user attempted to refresh token', {
          userId: decoded.id,
        });
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role as UserRole,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.debug('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn('Invalid refresh token', { error: error.message });
      } else {
        this.logger.error('Failed to verify refresh token', {
          error: (error as Error).message,
        });
      }
      return null;
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'refresh') {
        return;
      }

      // Remove from database
      await this.database.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token_hash = $2',
        [decoded.id, await bcrypt.hash(token, 10)]
      );

      // Remove from cache
      await this.cache.delete(`${this.REFRESH_TOKEN_PREFIX}${decoded.id}`);

      this.logger.info('Refresh token revoked successfully', {
        userId: decoded.id,
      });
    } catch (error) {
      this.logger.error('Failed to revoke refresh token', {
        error: (error as Error).message,
      });
    }
  }

  generateEmailVerificationToken(): string {
    return uuidv4();
  }

  generatePasswordResetToken(): string {
    return uuidv4();
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        ignoreExpiration: true,
      }) as any;
      const expiresIn = Math.max(
        0,
        decoded.exp - Math.floor(Date.now() / 1000)
      );

      await this.cache.set(
        `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
        true,
        expiresIn
      );

      this.logger.info('Token blacklisted successfully');
    } catch (error) {
      this.logger.error('Failed to blacklist token', {
        error: (error as Error).message,
      });
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const isBlacklisted = await this.cache.exists(
        `${this.TOKEN_BLACKLIST_PREFIX}${token}`
      );
      return isBlacklisted;
    } catch (error) {
      this.logger.error('Failed to check token blacklist', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.database.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         refresh_token_hash = $2,
         expires_at = $3,
         updated_at = NOW()`,
      [userId, refreshTokenHash, expiresAt]
    );
  }

  private async isRefreshTokenValid(
    userId: string,
    refreshToken: string
  ): Promise<boolean> {
    try {
      const result = await this.database.query(
        'SELECT refresh_token_hash FROM user_sessions WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const storedHash = result.rows[0].refresh_token_hash;
      return await bcrypt.compare(refreshToken, storedHash);
    } catch (error) {
      this.logger.error('Failed to validate refresh token', {
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export { AuthService };
