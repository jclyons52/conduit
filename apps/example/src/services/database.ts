import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/environment';
import { ILogger } from './logger';
export class Database {
  private pool: Pool | null = null;
  private connected = false;

  constructor(
    private logger: ILogger,
    url: string,
    host: string,
    port: number,
    database: string,
    user: string,
    password?: string
  ) {
    this.pool = new Pool({
      connectionString: url,
      host: host,
      port: port,
      database: database,
      user: user,
      password: password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('error', err => {
      this.logger.error('Database pool error', {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  async connect(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      this.logger.info('Connecting to PostgreSQL database...');

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.connected = true;
      this.logger.info('Successfully connected to PostgreSQL database');

      // Initialize database schema
      await this.initializeSchema();
    } catch (error) {
      this.logger.error('Failed to connect to database', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      this.logger.info('Disconnecting from database...');
      await this.pool.end();
      this.connected = false;
      this.logger.info('Database disconnected');
    }
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    this.logger.debug('Executing database query', { query: text, params });

    try {
      const result = await this.pool.query<T>(text, params);
      this.logger.debug('Query executed successfully', {
        rowCount: result.rowCount,
      });
      return result;
    } catch (error) {
      this.logger.error('Database query failed', {
        query: text,
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async initializeSchema(): Promise<void> {
    this.logger.info('Initializing database schema...');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token UUID,
        password_reset_token UUID,
        password_reset_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createUpdatedAtTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_sessions_updated_at ON user_sessions;
      CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON user_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.query(createUsersTable);
      await this.query(createSessionsTable);
      await this.query(createUpdatedAtTrigger);
      this.logger.info('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
