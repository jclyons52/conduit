// Example types to test enum, union, intersection handling

export enum StorageClass {
  STANDARD = 'STANDARD',
  REDUCED_REDUNDANCY = 'REDUCED_REDUNDANCY',
  GLACIER = 'GLACIER',
  GLACIER_IR = 'GLACIER_IR',
  DEEP_ARCHIVE = 'DEEP_ARCHIVE',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export type S3Region = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1';

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyId?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

// Intersection type example
export type S3ConfigWithRetry = EncryptionConfig & RetryConfig;