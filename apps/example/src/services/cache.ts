import { createClient, RedisClientType } from 'redis';
import { config } from '../config/environment';
import { ILogger } from './logger';

export interface ICache {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, amount?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  getPattern(pattern: string): Promise<string[]>;
  deletePattern(pattern: string): Promise<void>;
  isConnected(): boolean;
}

class CacheService implements ICache {
  private client: RedisClientType;
  private connected = false;

  constructor(private logger: ILogger) {
    const redisUrl = config.redis.password
      ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`
      : `redis://${config.redis.host}:${config.redis.port}`;

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.connected = true;
      this.logger.info('Redis client connected and ready');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', { error: err.message });
    });

    this.client.on('end', () => {
      this.connected = false;
      this.logger.info('Redis client disconnected');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to Redis...');
      await this.client.connect();
      this.logger.info('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', { error: (error as Error).message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.logger.info('Disconnecting from Redis...');
      await this.client.quit();
      this.logger.info('Redis disconnected');
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Cache get operation failed', { key, error: (error as Error).message });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      this.logger.debug('Cache set operation completed', { key, ttl: ttlSeconds });
    } catch (error) {
      this.logger.error('Cache set operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug('Cache delete operation completed', { key });
    } catch (error) {
      this.logger.error('Cache delete operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Cache exists operation failed', { key, error: (error as Error).message });
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.client.incrBy(key, amount);
      this.logger.debug('Cache increment operation completed', { key, amount, result });
      return result;
    } catch (error) {
      this.logger.error('Cache increment operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
      this.logger.debug('Cache expire operation completed', { key, ttl: ttlSeconds });
    } catch (error) {
      this.logger.error('Cache expire operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async getPattern(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      this.logger.error('Cache pattern get operation failed', { pattern, error: (error as Error).message });
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getPattern(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug('Cache pattern delete operation completed', { pattern, keysDeleted: keys.length });
      }
    } catch (error) {
      this.logger.error('Cache pattern delete operation failed', { pattern, error: (error as Error).message });
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export { CacheService };