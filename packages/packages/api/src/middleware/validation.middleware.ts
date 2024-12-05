import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { APIError } from '../utils/errors';

interface ValidationSchema {
  body?: z.ZodType<any>;
  query?: z.ZodType<any>;
  params?: z.ZodType<any>;
}

export const validationMiddleware = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body if schema provided
      if (schema.body) {
        try {
          req.body = await schema.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return next(new APIError(
              400,
              'VALIDATION_ERROR',
              error.errors.map(e => e.message).join(', ')
            ));
          }
          throw error;
        }
      }

      // Validate query params if schema provided
      if (schema.query) {
        try {
          // Convert string numbers to actual numbers for validation
          const parsedQuery = Object.entries(req.query).reduce((acc, [key, value]) => {
            if (typeof value === 'string' && !isNaN(Number(value))) {
              acc[key] = Number(value);
            } else {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, any>);

          req.query = await schema.query.parseAsync(parsedQuery);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return next(new APIError(
              400,
              'VALIDATION_ERROR',
              error.errors.map(e => e.message).join(', ')
            ));
          }
          throw error;
        }
      }

      // Validate URL params if schema provided
      if (schema.params) {
        try {
          req.params = await schema.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return next(new APIError(
              400,
              'VALIDATION_ERROR',
              error.errors.map(e => e.message).join(', ')
            ));
          }
          throw error;
        }
      }

      next();
    } catch (error) {
      // Handle custom validator errors
      if (error instanceof Error) {
        return next(new APIError(
          400,
          'VALIDATION_ERROR',
          error.message
        ));
      }
      next(new APIError(500, 'VALIDATION_FAILED', 'Validation processing failed'));
    }
  };
}; 