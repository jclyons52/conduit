// Logger service interface and implementation
export interface Logger {
  log(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export class ConsoleLogger implements Logger {
  constructor(private prefix: string) {}

  log(message: string): void {
    console.log(`${this.prefix}: ${message}`);
  }

  error(message: string): void {
    console.error(`${this.prefix}: ERROR - ${message}`);
  }

  info(message: string): void {
    console.info(`${this.prefix}: INFO - ${message}`);
  }
}

export class FileLogger implements Logger {
  constructor(
    private prefix: string,
    private filePath: string
  ) {}

  log(message: string): void {
    // In real implementation, would write to file
    console.log(`[FILE:${this.filePath}] ${this.prefix}: ${message}`);
  }

  error(message: string): void {
    console.log(`[FILE:${this.filePath}] ${this.prefix}: ERROR - ${message}`);
  }

  info(message: string): void {
    console.log(`[FILE:${this.filePath}] ${this.prefix}: INFO - ${message}`);
  }
}
