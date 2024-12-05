import { AuthService } from '../auth.service';
import { prismaMock } from '../../../../jest.setup';
import { APIError } from '../../../utils/errors';
import { createMockUser, createMockAuthToken } from '../../../utils/__tests__/test-helpers';
import { UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    (service as any).prisma = prismaMock;
    jest.clearAllMocks();

    // Setup transaction mock
    prismaMock.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(prismaMock);
      }
      return callback;
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const mockUser = createMockUser({
        email,
        password: 'hashed_password'
      });

      const mockToken = createMockAuthToken({
        user_id: mockUser.id
      });

      // Mock the transaction implementation
      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
          (prismaMock as any).authToken = {
            create: jest.fn().mockResolvedValueOnce(mockToken)
          };
          return callback(prismaMock);
        }
        return callback;
      });

      const result = await service.login(email, password);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should throw error for invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'wrong_password';

      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          prismaMock.user.findUnique.mockResolvedValueOnce(null);
          return callback(prismaMock);
        }
        return callback;
      });

      await expect(service.login(email, password))
        .rejects
        .toThrow(APIError);
    });

    it('should throw error for incorrect password', async () => {
      const email = 'test@example.com';
      const password = 'wrong_password';

      const mockUser = createMockUser({
        email,
        password: 'hashed_password'
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
          (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
          return callback(prismaMock);
        }
        return callback;
      });

      await expect(service.login(email, password))
        .rejects
        .toThrow(APIError);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const role = UserRole.ADMIN;

      const mockUser = createMockUser({
        email,
        role
      });

      const mockToken = createMockAuthToken({
        user_id: mockUser.id
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          prismaMock.user.findUnique.mockResolvedValueOnce(null);
          prismaMock.user.create.mockResolvedValueOnce(mockUser);
          (prismaMock as any).authToken = {
            create: jest.fn().mockResolvedValueOnce(mockToken)
          };
          return callback(prismaMock);
        }
        return callback;
      });

      const result = await service.register(email, password, role);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(email);
      expect(result.user.role).toBe(role);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should throw error for existing email', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const role = UserRole.ADMIN;

      const existingUser = createMockUser({ email });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          prismaMock.user.findUnique.mockResolvedValueOnce(existingUser);
          return callback(prismaMock);
        }
        return callback;
      });

      await expect(service.register(email, password, role))
        .rejects
        .toThrow(APIError);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const mockToken = createMockAuthToken();
      const mockUser = createMockUser();

      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          (prismaMock as any).authToken = {
            findFirst: jest.fn().mockResolvedValueOnce(mockToken)
          };
          prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
          return callback(prismaMock);
        }
        return callback;
      });

      const result = await service.validateToken(mockToken.token);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
    });

    it('should throw error for invalid token', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          (prismaMock as any).authToken = {
            findFirst: jest.fn().mockResolvedValueOnce(null)
          };
          return callback(prismaMock);
        }
        return callback;
      });

      await expect(service.validateToken('invalid_token'))
        .rejects
        .toThrow(APIError);
    });
  });
}); 