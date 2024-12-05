import { Request, Response, NextFunction } from 'express';
import { APIError } from '../utils/errors';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    stack?: string;
  };
}

const DATABASE_ERROR_CODES = {
  P2002: { status: 409, message: 'Database constraint violation' },
  P1001: { status: 503, message: 'Database connection failed' },
  P1002: { status: 503, message: 'Database connection failed' }
} as const;

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle API Errors
  if (error instanceof APIError) {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message
      }
    };

    if (process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }

    return res.status(error.status).json(response);
  }

  // Handle Prisma Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorConfig = DATABASE_ERROR_CODES[error.code as keyof typeof DATABASE_ERROR_CODES] || {
      status: 500,
      message: 'Database operation failed'
    };

    return res.status(errorConfig.status).json({
      error: {
        code: 'DATABASE_ERROR',
        message: errorConfig.message
      }
    });
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred'
    }
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return res.status(500).json(response);
}; 