// Database service interface and implementation
export interface Database {
  query(sql: string): Promise<any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class PostgresDatabase implements Database {
  constructor(private connectionString: string) {}

  async connect(): Promise<void> {
    console.log(`Connecting to PostgreSQL: ${this.connectionString}`);
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from PostgreSQL');
  }

  async query(sql: string): Promise<any> {
    console.log(`Executing SQL: ${sql}`);
    // Mock response
    return {
      rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      rowCount: 1,
    };
  }
}

export class RedisCache implements Database {
  constructor(
    private host: string,
    private port: number,
    private password?: string
  ) {}

  async connect(): Promise<void> {
    console.log(`Connecting to Redis: ${this.host}:${this.port}`);
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from Redis');
  }

  async query(key: string): Promise<any> {
    console.log(`Redis GET: ${key}`);
    return { value: 'cached-data', ttl: 3600 };
  }
}
