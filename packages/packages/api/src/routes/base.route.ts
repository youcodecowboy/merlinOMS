import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate-request';
import { ZodType } from 'zod';
import { AuthenticatedRequest } from '@app/types';

export abstract class BaseRoute {
  public router: Router;
  
  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  protected abstract initializeRoutes(): void;

  protected createRoute(options: {
    path: string;
    method: 'get' | 'post' | 'put' | 'delete';
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    schema?: ZodType;
    skipAuth?: boolean;
  }) {
    const middleware = [];
    
    if (!options.skipAuth) {
      middleware.push(authenticate);
    }
    
    if (options.schema) {
      middleware.push(validateRequest(options.schema));
    }
    
    this.router[options.method](
      options.path,
      ...middleware,
      this.wrapHandler(options.handler)
    );
  }

  private wrapHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
    return async (req: Request, res: Response) => {
      try {
        await handler(req as AuthenticatedRequest, res);
      } catch (error) {
        // Let the error handler middleware deal with it
        throw error;
      }
    };
  }
} 