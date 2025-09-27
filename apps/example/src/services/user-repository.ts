import { ILogger } from './logger';
import { Database } from './database';
import {
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
  PaginationQuery,
} from '../types/api';

class UserRepository {
  /**
   * Get password hash by email. Returns null if not found.
   */
  async getPasswordHashByEmail(email: string): Promise<string | null> {
    try {
      const result = await this.database.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      if (result.rows.length === 0) return null;
      return result.rows[0].password_hash;
    } catch (error) {
      this.logger.error('Failed to get password hash by email', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get password hash by user id. Returns null if not found.
   */
  async getPasswordHashById(id: string): Promise<string | null> {
    try {
      const result = await this.database.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      return result.rows[0].password_hash;
    } catch (error) {
      this.logger.error('Failed to get password hash by id', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update password hash by user id.
   */
  async updatePasswordById(id: string, passwordHash: string): Promise<void> {
    try {
      await this.database.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, id]
      );
      this.logger.info('Password updated for user', { userId: id });
    } catch (error) {
      this.logger.error('Failed to update password by id', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set email verification token for a user by id.
   */
  async setEmailVerificationToken(id: string, token: string): Promise<void> {
    try {
      await this.database.query(
        'UPDATE users SET email_verification_token = $1 WHERE id = $2',
        [token, id]
      );
      this.logger.info('Email verification token set', { userId: id });
    } catch (error) {
      this.logger.error('Failed to set email verification token', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }
  constructor(
    private logger: ILogger,
    private database: Database
  ) {}

  async findById(id: string): Promise<User | null> {
    try {
      this.logger.debug('Finding user by ID', { userId: id });

      const result = await this.database.query(
        `SELECT id, email, first_name, last_name, role, is_active, email_verified,
                last_login_at, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error) {
      this.logger.error('Failed to find user by ID', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      this.logger.debug('Finding user by email', { email });

      const result = await this.database.query(
        `SELECT id, email, first_name, last_name, role, is_active, email_verified,
                last_login_at, created_at, updated_at
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error) {
      this.logger.error('Failed to find user by email', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findAll(
    pagination: PaginationQuery = {}
  ): Promise<{ users: User[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = pagination;
      const offset = (page - 1) * limit;

      this.logger.debug('Finding all users', {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      // Get total count
      const countResult = await this.database.query(
        'SELECT COUNT(*) FROM users'
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get users with pagination
      const result = await this.database.query(
        `SELECT id, email, first_name, last_name, role, is_active, email_verified,
                last_login_at, created_at, updated_at
         FROM users
         ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const users = result.rows.map(row => this.mapRowToUser(row));

      this.logger.info('Users found', { count: users.length, total });

      return { users, total };
    } catch (error) {
      this.logger.error('Failed to find all users', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async create(
    userData: CreateUserRequest & {
      passwordHash: string;
      emailVerificationToken?: string;
    }
  ): Promise<User> {
    try {
      this.logger.info('Creating new user', { email: userData.email });

      const result = await this.database.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verification_token)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, is_active, email_verified,
                   last_login_at, created_at, updated_at`,
        [
          userData.email.toLowerCase(),
          userData.passwordHash,
          userData.firstName,
          userData.lastName,
          userData.role || UserRole.USER,
          userData.emailVerificationToken,
        ]
      );

      const row = result.rows[0];
      const user = this.mapRowToUser(row);

      this.logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error('Failed to create user', {
        email: userData.email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async update(id: string, userData: UpdateUserRequest): Promise<User | null> {
    try {
      this.logger.info('Updating user', { userId: id });

      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (userData.firstName !== undefined) {
        setParts.push(`first_name = $${paramIndex++}`);
        values.push(userData.firstName);
      }

      if (userData.lastName !== undefined) {
        setParts.push(`last_name = $${paramIndex++}`);
        values.push(userData.lastName);
      }

      if (userData.role !== undefined) {
        setParts.push(`role = $${paramIndex++}`);
        values.push(userData.role);
      }

      if (userData.isActive !== undefined) {
        setParts.push(`is_active = $${paramIndex++}`);
        values.push(userData.isActive);
      }

      if (setParts.length === 0) {
        this.logger.warn('No fields to update', { userId: id });
        return await this.findById(id);
      }

      values.push(id);

      const result = await this.database.query(
        `UPDATE users
         SET ${setParts.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, email, first_name, last_name, role, is_active, email_verified,
                   last_login_at, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const user = this.mapRowToUser(row);

      this.logger.info('User updated successfully', { userId: user.id });

      return user;
    } catch (error) {
      this.logger.error('Failed to update user', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.info('Deleting user', { userId: id });

      await this.database.query('DELETE FROM users WHERE id = $1', [id]);

      this.logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      this.logger.error('Failed to delete user', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async setEmailVerified(id: string, verified: boolean): Promise<void> {
    try {
      this.logger.info('Setting email verification status', {
        userId: id,
        verified,
      });

      await this.database.query(
        'UPDATE users SET email_verified = $1, email_verification_token = NULL WHERE id = $2',
        [verified, id]
      );

      this.logger.info('Email verification status updated', {
        userId: id,
        verified,
      });
    } catch (error) {
      this.logger.error('Failed to set email verification status', {
        userId: id,
        verified,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async setPasswordResetToken(
    email: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      this.logger.info('Setting password reset token', { email });

      await this.database.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
        [token, expiresAt, email.toLowerCase()]
      );

      this.logger.info('Password reset token set', { email });
    } catch (error) {
      this.logger.error('Failed to set password reset token', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      this.logger.debug('Finding user by password reset token');

      const result = await this.database.query(
        `SELECT id, email, first_name, last_name, role, is_active, email_verified,
                last_login_at, created_at, updated_at
         FROM users
         WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error) {
      this.logger.error('Failed to find user by password reset token', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    try {
      this.logger.info('Clearing password reset token', { userId: id });

      await this.database.query(
        'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
        [id]
      );

      this.logger.info('Password reset token cleared', { userId: id });
    } catch (error) {
      this.logger.error('Failed to clear password reset token', {
        userId: id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.database.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [id]
      );

      this.logger.debug('Last login updated', { userId: id });
    } catch (error) {
      this.logger.error('Failed to update last login', {
        userId: id,
        error: (error as Error).message,
      });
    }
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    try {
      this.logger.debug('Finding user by email verification token');

      const result = await this.database.query(
        `SELECT id, email, first_name, last_name, role, is_active, email_verified,
                last_login_at, created_at, updated_at
         FROM users
         WHERE email_verification_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error) {
      this.logger.error('Failed to find user by email verification token', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export { UserRepository };
