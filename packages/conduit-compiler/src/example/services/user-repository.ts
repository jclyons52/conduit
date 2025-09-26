import { Database } from './database';
import { Logger } from './logger';

export class UserRepository {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<any> {
    this.logger.info(`Finding user by ID: ${id}`);
    const result = await this.database.query(
      `SELECT * FROM users WHERE id = '${id}'`
    );
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<any> {
    this.logger.info(`Finding user by email: ${email}`);
    const result = await this.database.query(
      `SELECT * FROM users WHERE email = '${email}'`
    );
    return result.rows[0];
  }

  async create(user: any): Promise<any> {
    this.logger.info(`Creating user: ${user.email}`);
    const result = await this.database.query(
      `INSERT INTO users (name, email) VALUES ('${user.name}', '${user.email}') RETURNING *`
    );
    return result.rows[0];
  }

  async update(id: string, user: any): Promise<any> {
    this.logger.info(`Updating user: ${id}`);
    const result = await this.database.query(
      `UPDATE users SET name = '${user.name}', email = '${user.email}' WHERE id = '${id}' RETURNING *`
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    this.logger.info(`Deleting user: ${id}`);
    await this.database.query(`DELETE FROM users WHERE id = '${id}'`);
  }
}
