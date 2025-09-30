import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { S3Region } from '../types/aws-types';
import { ILogger } from './logger';

export interface QueueConfig {
  region: S3Region;
  queueUrl: string;
  visibilityTimeout: number;
  messageRetentionPeriod: number;
}

export type MessageHandler = (message: string) => Promise<void>;

export class QueueService {
  private client: SQSClient;
  private handlers: MessageHandler[] = [];

  constructor(
    private logger: ILogger,
    region: S3Region,
    queueUrl: string,
    visibilityTimeout: number,
    messageRetentionPeriod: number
  ) {
    this.client = new SQSClient({ region });

    this.logger.info('QueueService initialized', {
      region,
      queueUrl,
      visibilityTimeout,
      messageRetentionPeriod,
    });
  }

  registerHandler(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  async sendMessage(messageBody: string, delaySeconds?: number): Promise<void> {
    this.logger.debug('Sending message to queue', { messageBody });

    try {
      const command = new SendMessageCommand({
        QueueUrl: 'queueUrl',
        MessageBody: messageBody,
        DelaySeconds: delaySeconds,
      });

      await this.client.send(command);
      this.logger.info('Message sent to queue');
    } catch (error) {
      this.logger.error('Failed to send message to queue', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async receiveMessages(maxMessages: number = 1): Promise<void> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: 'queueUrl',
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20,
      });

      const response = await this.client.send(command);
      const messages = response.Messages || [];

      this.logger.debug(`Received ${messages.length} messages from queue`);

      for (const message of messages) {
        if (message.Body) {
          // Process with all registered handlers
          await Promise.all(
            this.handlers.map(handler => handler(message.Body!))
          );

          // Delete message after successful processing
          if (message.ReceiptHandle) {
            await this.deleteMessage(message.ReceiptHandle);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to receive messages from queue', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: 'queueUrl',
        ReceiptHandle: receiptHandle,
      });

      await this.client.send(command);
      this.logger.debug('Message deleted from queue');
    } catch (error) {
      this.logger.error('Failed to delete message from queue', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}