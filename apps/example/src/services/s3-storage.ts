import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageClass, S3Region } from '../types/aws-types';
import { ILogger } from './logger';

export interface S3Config {
  region: S3Region;
  bucket: string;
  storageClass: StorageClass;
  endpoint?: string;
  forcePathStyle: boolean;
}

export class S3Storage {
  private client: S3Client;

  constructor(
    private logger: ILogger,
    region: S3Region,
    bucket: string,
    storageClass: StorageClass,
    endpoint: string | undefined,
    forcePathStyle: boolean
  ) {
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
    });

    this.logger.info('S3Storage initialized', {
      region,
      bucket,
      storageClass,
    });
  }

  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType: string
  ): Promise<void> {
    this.logger.debug('Uploading file to S3', { key, contentType });

    try {
      const command = new PutObjectCommand({
        Bucket: 'bucket',
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.client.send(command);
      this.logger.info('File uploaded successfully', { key });
    } catch (error) {
      this.logger.error('Failed to upload file to S3', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    this.logger.debug('Downloading file from S3', { key });

    try {
      const command = new GetObjectCommand({
        Bucket: 'bucket',
        Key: key,
      });

      const response = await this.client.send(command);
      const body = await response.Body?.transformToByteArray();

      if (!body) {
        throw new Error('No body returned from S3');
      }

      this.logger.info('File downloaded successfully', { key });
      return Buffer.from(body);
    } catch (error) {
      this.logger.error('Failed to download file from S3', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}