import request from 'supertest';
import express, { Express } from 'express';
import { prismaMock } from '../../../jest.setup';
import { authRoutes } from '../auth.routes';
import { createMockUser, createMockAuthToken } from '../../utils/__tests__/test-helpers';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockToken = createMockAuthToken({
        user_id: mockUser.id,
        type: 'access'
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.authToken.create.mockResolvedValue(mockToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Mock successful password verification

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: mockUser.email,
          password: 'correct_password'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        token: mockToken.token,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role
        }
      });
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrong_password'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: ''
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid email')
        }
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const mockUser = createMockUser();
      const oldToken = createMockAuthToken({
        user_id: mockUser.id,
        type: 'refresh',
        revoked: false
      });
      const newToken = createMockAuthToken({
        user_id: mockUser.id,
        type: 'access'
      });

      // Mock with proper Prisma types
      prismaMock.authToken.findUnique.mockResolvedValue({
        ...oldToken,
        user: {
          ...mockUser,
          // Add Prisma client function mocks
          $fragment: jest.fn(),
          $queryRaw: jest.fn(),
          $executeRaw: jest.fn(),
          $queryRawUnsafe: jest.fn(),
          $executeRawUnsafe: jest.fn(),
          $runCommandRaw: jest.fn()
        }
      } as any);
      prismaMock.authToken.create.mockResolvedValue(newToken);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: oldToken.token
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        token: newToken.token
      });
    });

    it('should reject invalid refresh token', async () => {
      // Arrange
      prismaMock.authToken.findUnique.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    });

    it('should reject revoked refresh token', async () => {
      // Arrange
      const mockUser = createMockUser();
      const revokedToken = createMockAuthToken({
        user_id: mockUser.id,
        type: 'refresh',
        revoked: true
      });

      // Mock with proper Prisma types
      prismaMock.authToken.findUnique.mockResolvedValue({
        ...revokedToken,
        user: {
          ...mockUser,
          // Add Prisma client function mocks
          $fragment: jest.fn(),
          $queryRaw: jest.fn(),
          $executeRaw: jest.fn(),
          $queryRawUnsafe: jest.fn(),
          $executeRawUnsafe: jest.fn(),
          $runCommandRaw: jest.fn()
        }
      } as any);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: revokedToken.token
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked'
        }
      });
    });
  });
}); 