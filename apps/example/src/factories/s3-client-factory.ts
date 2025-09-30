import { S3 } from '@aws-sdk/client-s3';

// Factory function type that returns an AWS SDK type from node_modules
export type S3ClientFactory = () => S3;