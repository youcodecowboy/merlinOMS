import { Request } from 'express';
import type { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    email: string;
  };
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | string[] | undefined;
}

export interface RequestBase {
  id: string;
  type: string;
  status: string;
  actorRole: UserRole;
  // ... other fields
} 