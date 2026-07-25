import { Request } from 'express';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId: string;
}

export interface AuthenticatedRequest extends Request {
  requestId: string;
}

export interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  userId?: string | undefined;
  statusCode?: number | undefined;
  responseTime?: number | undefined;
  requestBody?: unknown;
  responseBody?: unknown;
  headers?: Record<string, string> | undefined;
  query?: Record<string, unknown> | undefined;
  params?: Record<string, unknown> | undefined;
  error?: string | undefined;
}
