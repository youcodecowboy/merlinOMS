import { Request, Response } from 'express';
import { PrismaTransaction } from './prisma.types';

export interface ServiceContext {
  prisma: PrismaTransaction;
  actorId: string;
  requestId?: string;
}

export interface ServiceHandler<T = any> {
  (req: Request, res: Response): Promise<T>;
}

export interface ServiceOptions {
  requiresTransaction?: boolean;
  validateRequest?: boolean;
  requiresAuth?: boolean;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    [key: string]: any;
  };
} 