import { Request, Response, NextFunction } from 'express';
import { validationMiddleware } from '../validation.middleware';
import { APIError } from '../../utils/errors';
import { z } from 'zod';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
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

  describe('Body Validation', () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
      email: z.string().email()
    });

    it('should validate valid request body', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com'
      };

      // Act
      await validationMiddleware({ body: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid request body', async () => {
      // Arrange
      mockReq.body = {
        name: 'Jo', // too short
        age: 15,    // under 18
        email: 'not-an-email'
      };

      // Act
      await validationMiddleware({ body: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: expect.stringMatching(/String must contain at least 3 character/)
        })
      );
    });
  });

  describe('Query Validation', () => {
    const schema = z.object({
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
      sort: z.enum(['asc', 'desc']).optional()
    });

    it('should validate valid query params', async () => {
      // Arrange
      mockReq.query = {
        page: '2',
        limit: '50',
        sort: 'desc'
      };

      // Act
      await validationMiddleware({ query: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid query params', async () => {
      // Arrange
      mockReq.query = {
        page: '-1',
        limit: '200',
        sort: 'invalid'
      };

      // Act
      await validationMiddleware({ query: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          code: 'VALIDATION_ERROR'
        })
      );
    });
  });

  describe('Custom Validators', () => {
    const customValidator = (value: unknown) => {
      if (typeof value !== 'string' || !value.startsWith('custom-')) {
        throw new Error('Must start with custom-');
      }
      return value;
    };

    const schema = z.object({
      customField: z.string().refine(customValidator)
    });

    it('should validate with custom validator', async () => {
      // Arrange
      mockReq.body = {
        customField: 'custom-value'
      };

      // Act
      await validationMiddleware({ body: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid custom validation', async () => {
      // Arrange
      mockReq.body = {
        customField: 'invalid-value'
      };

      // Act
      await validationMiddleware({ body: schema })(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Must start with custom-')
        })
      );
    });
  });
}); 