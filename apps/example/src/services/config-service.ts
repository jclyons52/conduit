import { ILogger } from './logger';

// Object type with various property types to test parser
export interface ServiceConfig {
  endpoints: {
    api: string;
    websocket: string;
  };
  timeouts: {
    connect: number;
    read: number;
    write: number;
  };
  features: {
    [key: string]: boolean;
  };
}

export class ConfigService {
  constructor(
    private logger: ILogger,
    endpoints: { api: string; websocket: string },
    timeouts: { connect: number; read: number; write: number }
  ) {
    this.logger.info('ConfigService initialized', {
      endpoints,
      timeouts,
    });
  }

  getEndpoint(type: 'api' | 'websocket'): string {
    return type === 'api' ? 'api-url' : 'ws-url';
  }

  getTimeout(type: 'connect' | 'read' | 'write'): number {
    return 5000;
  }
}