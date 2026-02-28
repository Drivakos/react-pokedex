/**
 * Production-safe logging utility
 * Only logs errors and warnings in development, suppresses in production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors that are actionable
    if (!this.isDevelopment) {
      return level === 'error';
    }
    return true;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  // Special method for service-level errors that should be minimal in production
  serviceError(service: string, operation: string, error: unknown): void {
    if (this.isDevelopment) {
      console.error(`[${service}] ${operation} failed:`, error);
    } else {
      // In production, only log critical service failures, not network/CSP issues
      if (error?.code !== 'PGRST301' && // Row Level Security violation
          error?.message !== 'JWT expired' &&
          !error?.message?.includes('network') &&
          !error?.message?.includes('CSP') &&
          !error?.message?.includes('Content Security Policy')) {
        console.error(`[${service}] ${operation} failed:`, error?.message || error);
      }
    }
  }
}

export const logger = new Logger();
