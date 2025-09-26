export class Database {
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
