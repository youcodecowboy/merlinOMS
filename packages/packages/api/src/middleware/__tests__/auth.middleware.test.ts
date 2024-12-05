import { Request, Response, NextFunction } from 'express';
import { prismaMock } from '../../../jest.setup';
import { authMiddleware } from '../auth.middleware';
import { createMockUser, createMockAuthToken } from '../../utils/__tests__/test-helpers';
import { APIError } from '../../utils/errors';

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

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

  it('should authenticate valid token successfully', async () => {
    // Arrange
    const mockUser = createMockUser();
    const mockToken = createMockAuthToken({
      user_id: mockUser.id,
      type: 'access',
      revoked: false,
      expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      user: mockUser
    });

    mockReq.headers = {
      authorization: `Bearer ${mockToken.token}`
    };

    prismaMock.authToken.findUnique.mockResolvedValue(mockToken);

    // Act
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user?.id).toBe(mockUser.id);
  });

  it('should reject missing token', async () => {
    // Arrange
    mockReq.headers = {};

    // Act
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      new APIError(401, 'UNAUTHORIZED', 'No token provided')
    );
  });

  it('should reject invalid token format', async () => {
    // Arrange
    mockReq.headers = {
      authorization: 'InvalidFormat token123'
    };

    // Act
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      new APIError(401, 'UNAUTHORIZED', 'Invalid token format')
    );
  });

  it('should reject expired token', async () => {
    // Arrange
    const mockToken = createMockAuthToken({
      expires_at: new Date(Date.now() - 3600000) // 1 hour ago
    });

    mockReq.headers = {
      authorization: `Bearer ${mockToken.token}`
    };

    prismaMock.authToken.findUnique.mockResolvedValue(mockToken);

    // Act
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      new APIError(401, 'UNAUTHORIZED', 'Token expired')
    );
  });

  it('should reject revoked token', async () => {
    // Arrange
    const mockToken = createMockAuthToken({
      revoked: true,
      expires_at: new Date(Date.now() + 3600000)
    });

    mockReq.headers = {
      authorization: `Bearer ${mockToken.token}`
    };

    prismaMock.authToken.findUnique.mockResolvedValue(mockToken);

    // Act
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(
      new APIError(401, 'UNAUTHORIZED', 'Token revoked')
    );
  });
}); 