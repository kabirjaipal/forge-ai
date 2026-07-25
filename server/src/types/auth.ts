import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  workspaceId?: string;
}
