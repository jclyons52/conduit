import { EventEmitter } from 'events';
import { ILogger } from './logger';
import { S3 } from '@aws-sdk/client-s3';

// Service that uses a Node.js built-in module (should import from 'events' not relative path)
export class EventEmitterService {
  private emitter: EventEmitter;

  constructor(
    private logger: ILogger,
    private s3Client: S3,
    maxListeners: number
  ) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(maxListeners);
    this.logger.info('EventEmitterService initialized', { maxListeners });
  }

  emit(event: string, data: any): void {
    this.logger.debug(`Emitting event: ${event}`);
    this.emitter.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler);
  }

  persistEventToS3(
    event: string,
    data: any,
    bucket: string,
    key: string
  ): void {
    this.logger.debug(`Persisting event: ${event} to S3 bucket: ${bucket}`);
    this.s3Client
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        }),
      })
      .then(() => {
        this.logger.info(`Event persisted to S3: s3://${bucket}/${key}`);
      })
      .catch(err => {
        this.logger.error('Error persisting event to S3', { error: err });
      });
  }
}
