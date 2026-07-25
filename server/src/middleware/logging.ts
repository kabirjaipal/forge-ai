import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import logger from '../lib/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type HttpMiddleware = (req: Request, res: Response, next: NextFunction) => void;
type PinoHttpOptions = {
  logger: import('pino').Logger;
  serializers?: Record<string, (arg: unknown) => unknown>;
  customLogLevel?: (req: Request, res: Response, err?: Error) => LogLevel;
  customSuccessMessage?: (req: Request, res: Response, responseTime: number) => string;
  customErrorMessage?: (req: Request, res: Response, err: Error) => string;
  customProps?: (req: Request, res: Response) => Record<string, unknown>;
};

const pinoHttpFactory = pinoHttp as unknown as (opts: PinoHttpOptions) => HttpMiddleware;
const pinoHttpLogger = pinoHttpFactory({
  logger,
  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
  customLogLevel: (_req: Request, res: Response, err: Error | undefined) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500 || err) return 'error';
    return 'info';
  },
  customSuccessMessage: (req: Request, res: Response, responseTime: number) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${responseTime}ms)`;
  },
  customErrorMessage: (req: Request, res: Response, err: Error) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${err?.message}`;
  },
  customProps: (req: Request) => ({
    requestId: (req as AuthenticatedRequest).requestId,
  }),
});

export const httpLogger = pinoHttpLogger;
