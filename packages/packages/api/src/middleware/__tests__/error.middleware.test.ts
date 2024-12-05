import { Request, Response, NextFunction } from 'express';
import { errorMiddleware } from '../error.middleware';
import { APIError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'set-cookie') return undefined;
        return mockReq.headers?.[name];
      })
    } as Partial<Request>;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('API Error Handling', () => {
    it('should handle APIError correctly', () => {
      // Arrange
      const error = new APIError(400, 'VALIDATION_ERROR', 'Invalid input');

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input'
        }
      });
    });

    it('should include stack trace in development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new APIError(400, 'VALIDATION_ERROR', 'Invalid input');

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String)
          })
        })
      );

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Database Error Handling', () => {
    it('should handle Prisma errors', () => {
      // Arrange
      const error = new Error('Unique constraint failed') as Prisma.PrismaClientKnownRequestError;
      error.code = 'P2002';
      Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database constraint violation'
        }
      });
    });

    it('should handle connection errors', () => {
      // Arrange
      const error = new Error('Connection failed') as Prisma.PrismaClientKnownRequestError;
      error.code = 'P1001';
      Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection failed'
        }
      });
    });
  });

  describe('Unknown Error Handling', () => {
    it('should handle unknown errors safely', () => {
      // Arrange
      const error = new Error('Something went wrong');

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    });

    it('should not expose error details in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Sensitive error details');

      // Act
      errorMiddleware(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
}); 