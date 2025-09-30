import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createContainer } from '@typewryter/di';
import { AppDependencies } from './app-dependencies';
import { config } from './config/environment';
import { ILogger } from './services/logger';
import { UserService } from './services/user-service';
import { Database } from './services/database';
import { Cache } from './services/cache';

export class App {
  private app: express.Application;

  constructor(
    private logger: ILogger,
    private userService: UserService,
    private database: Database,
    private cache: Cache
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(
      cors({
        origin: config.nodeEnv === 'production' ? false : true,
        credentials: true,
      })
    );

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      const logger = this.logger;
      logger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const logger = this.logger;
      const database = this.database;
      const cache = this.cache;

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: database.isConnected(),
          cache: cache.isConnected(),
        },
      };

      logger.info('Health check requested', health);
      res.json(health);
    });

    // API routes
    this.app.get('/api/users', async (req, res) => {
      try {
        const logger = this.logger;
        const userService = this.userService;

        logger.info('Getting all users via API');

        // Mock user data since we have interface mismatches
        const mockUsers = [
          {
            id: '1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'user',
            isActive: true,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            email: 'jane@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'admin',
            isActive: true,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        res.json({
          success: true,
          data: {
            users: mockUsers,
            total: mockUsers.length,
          },
        });
      } catch (error) {
        const logger = this.logger;
        logger.error('Failed to get users', {
          error: (error as Error).message,
        });

        res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    });

    // Register endpoint
    this.app.post('/api/auth/register', async (req, res) => {
      try {
        const logger = this.logger;
        const { email, password, firstName, lastName } = req.body;

        logger.info('User registration attempt', { email });

        // Mock successful registration
        const mockUser = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          firstName,
          lastName,
          role: 'user',
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        };

        res.status(201).json({
          success: true,
          data: {
            user: mockUser,
            tokens: mockTokens,
          },
        });
      } catch (error) {
        const logger = this.logger;
        logger.error('Registration failed', {
          error: (error as Error).message,
        });

        res.status(400).json({
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : 'Registration failed',
            code: 'REGISTRATION_ERROR',
          },
        });
      }
    });

    // Login endpoint
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const logger = this.logger;
        const { email, password } = req.body;

        logger.info('Login attempt', { email });

        // Mock successful login
        const mockUser = {
          id: '1',
          email,
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
        };

        const mockTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        };

        res.json({
          success: true,
          data: {
            user: mockUser,
            tokens: mockTokens,
          },
        });
      } catch (error) {
        const logger = this.logger;
        logger.error('Login failed', { error: (error as Error).message });

        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          },
        });
      }
    });

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Route not found',
          code: 'NOT_FOUND',
        },
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(
      (
        error: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const logger = this.logger;
        logger.error('Unhandled error', {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });

        res.status(500).json({
          success: false,
          error: {
            message:
              config.nodeEnv === 'production'
                ? 'Internal server error'
                : error.message,
            code: 'INTERNAL_ERROR',
          },
        });
      }
    );
  }

  public async start(): Promise<void> {
    try {
      const logger = this.logger;

      // Initialize services
      logger.info('Initializing services...');

      // We'll skip actual database/cache connections for this demo
      // await this.database.connect();
      // await this.cache.connect();

      // Start the server
      this.app.listen(config.port, () => {
        logger.info(`🚀 Server started successfully`, {
          port: config.port,
          nodeEnv: config.nodeEnv,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      const logger = this.logger;
      logger.error('Failed to start server', {
        error: (error as Error).message,
      });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      const logger = this.logger;
      logger.info('Shutting down server...');

      // Clean up services
      // this.container.dispose();

      logger.info('Server shut down completed');
    } catch (error) {
      const logger = this.logger;
      logger.error('Error during shutdown', {
        error: (error as Error).message,
      });
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default App;
