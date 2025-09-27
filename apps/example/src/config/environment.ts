import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    url: string;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // Email
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    from: string;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    max: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };
}

function getEnvironmentConfig(): EnvironmentConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      name: process.env.DATABASE_NAME || 'conduit_example',
      user: process.env.DATABASE_USER || 'user',
      password: process.env.DATABASE_PASSWORD || 'password',
      url:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/conduit_example',
    },

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },

    jwt: {
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    email: {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    },

    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },

    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'combined',
    },
  };
}

export const config = getEnvironmentConfig();
