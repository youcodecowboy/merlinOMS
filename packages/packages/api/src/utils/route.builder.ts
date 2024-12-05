import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { APIError } from './errors';

interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  schema?: z.ZodSchema;
  roles?: UserRole[];
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  skipAuth?: boolean;
}

export class RouteBuilder {
  private router: Router;

  constructor() {
    this.router = Router();
  }

  addRoute(config: RouteConfig): this {
    const middleware = [];

    // Add authentication unless explicitly skipped
    if (!config.skipAuth) {
      middleware.push(authenticate);
    }

    // Add role authorization if roles are specified
    if (config.roles?.length) {
      middleware.push(authorize(config.roles));
    }

    // Add schema validation if schema is provided
    if (config.schema) {
      middleware.push(validateRequest(config.schema));
    }

    // Add error wrapped handler
    middleware.push(this.wrapHandler(config.handler));

    // Add route to router
    this.router[config.method](config.path, ...middleware);

    return this;
  }

  private wrapHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  build(): Router {
    return this.router;
  }
}

// Helper to create standardized success response
export const sendSuccess = (res: Response, data: any) => {
  res.json({
    success: true,
    data
  });
};

// Helper to create standardized error response
export const sendError = (res: Response, error: APIError) => {
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    code: error.code
  });
}; 