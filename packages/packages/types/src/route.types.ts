import { Request, Response } from 'express';
import { z } from 'zod';

export interface RouteHandler {
  (req: Request, res: Response): Promise<void>;
}

export interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  handler: RouteHandler;
  schema?: z.Schema;
  skipAuth?: boolean;
}

export interface RouteDefinition extends RouteConfig {
  middlewares?: any[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  [key: string]: string | string[] | undefined;
} 