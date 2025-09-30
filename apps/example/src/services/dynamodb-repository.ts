import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { S3Region } from '../types/aws-types';
import { ILogger } from './logger';

export interface DynamoDBConfig {
  region: S3Region;
  tableName: string;
  endpoint?: string;
}

export class DynamoDBRepository {
  private client: DynamoDBClient;

  constructor(
    private logger: ILogger,
    region: S3Region,
    tableName: string,
    endpoint: string | undefined
  ) {
    this.client = new DynamoDBClient({
      region,
      endpoint,
    });

    this.logger.info('DynamoDBRepository initialized', {
      region,
      tableName,
    });
  }

  async putItem(key: string, value: Record<string, any>): Promise<void> {
    this.logger.debug('Putting item to DynamoDB', { key });

    try {
      const command = new PutItemCommand({
        TableName: 'tableName',
        Item: {
          id: { S: key },
          data: { S: JSON.stringify(value) },
        },
      });

      await this.client.send(command);
      this.logger.info('Item saved to DynamoDB', { key });
    } catch (error) {
      this.logger.error('Failed to put item to DynamoDB', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getItem(key: string): Promise<Record<string, any> | null> {
    this.logger.debug('Getting item from DynamoDB', { key });

    try {
      const command = new GetItemCommand({
        TableName: 'tableName',
        Key: {
          id: { S: key },
        },
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        return null;
      }

      const data = response.Item.data?.S;
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Failed to get item from DynamoDB', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}