import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { APIError } from './error-handler';

export const validateRequest = (schema: z.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, 'VALIDATION_ERROR', error.errors.map(e => e.message).join(', '));
      }
      throw error;
    }
  };
}; 