# Conduit Example Backend API

A real-world backend API application demonstrating the integration of **conduit-di** (dependency injection framework) and **conduit-compiler** (compile-time container generation) packages.

## Features

🎯 **Complete Backend API** with REST endpoints
🔐 **Authentication & Authorization** with JWT tokens
🗄️ **Database Layer** with PostgreSQL integration
⚡ **Caching Layer** with Redis support
📧 **Email Services** with templated notifications
📊 **Comprehensive Logging** with Winston
🛡️ **Security Middleware** with Helmet and CORS
🏗️ **Dependency Injection** with conduit-di
📝 **Full TypeScript** type safety

## Architecture

### Services

- **LoggerService**: Winston-based logging with file and console output
- **DatabaseService**: PostgreSQL connection pool with schema management
- **CacheService**: Redis client for session and rate limiting
- **AuthService**: JWT token generation and validation with bcrypt
- **UserRepository**: Database operations for user management
- **EmailService**: SMTP email sending with HTML templates
- **UserService**: Business logic orchestrating all services

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and service status |
| `/api/users` | GET | List all users (paginated) |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/refresh` | POST | Token refresh |
| `/api/auth/verify-email` | GET | Email verification |

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

The server will start on `http://localhost:3000`

## Environment Configuration

Create a `.env` file with:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/conduit_example

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-here

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### List Users
```bash
curl http://localhost:3000/api/users
```

## Project Structure

```
src/
├── config/             # Environment and app configuration
│   └── environment.ts
├── services/           # Business logic and data access
│   ├── logger.ts       # Winston logging service
│   ├── database.ts     # PostgreSQL service
│   ├── cache.ts        # Redis caching service
│   ├── auth.ts         # JWT authentication service
│   ├── email.ts        # SMTP email service
│   ├── user-repository.ts # User data access
│   └── user-service.ts # User business logic
├── types/              # TypeScript interfaces
│   └── api.ts
├── middleware/         # Express middleware
├── routes/             # API route handlers
├── controllers/        # Request/response handling
├── utils/              # Helper functions
├── app-dependencies.ts # DI type definitions
├── container-definitions.ts # Service container setup
├── app.ts             # Express app configuration
└── index.ts           # Application entry point
```

## Dependency Injection

Services are configured with proper scoping:

```typescript
export const appServiceDefinitions = {
  // Singleton services (shared instances)
  logger: singleton(() => new LoggerService()),
  database: singleton(container => new DatabaseService(container.get('logger'))),
  cache: singleton(container => new CacheService(container.get('logger'))),

  // Scoped services (new instance per request)
  userRepository: scoped(container =>
    new UserRepository(container.get('logger'), container.get('database'))
  ),
  authService: scoped(container =>
    new AuthService(container.get('logger'), container.get('database'), container.get('cache'))
  ),
  userService: scoped(container =>
    new UserService(
      container.get('logger'),
      container.get('userRepository'),
      container.get('emailService'),
      container.get('authService')
    )
  ),
};
```

## Development

```bash
# Start in development mode with hot reload
npm run dev

# Build the application
npm run build

# Run built application
npm start

# Run tests
npm test

# Format code
npm run format

# Generate DI container with conduit-compiler
npm run compile
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database and Redis instances
3. Set secure JWT secrets
4. Configure SMTP for email delivery
5. Build and start: `npm run build && npm start`

This example demonstrates a production-ready backend API with proper separation of concerns, dependency injection, and comprehensive service architecture.