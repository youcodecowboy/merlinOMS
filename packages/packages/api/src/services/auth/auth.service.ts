import { BaseService } from '../base/base.service';
import { APIError } from '../../utils/errors';
import { UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export class AuthService extends BaseService {
  constructor() {
    super('AuthService');
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.withTransaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        throw new APIError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new APIError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const token = await tx.authToken.create({
        data: {
          user_id: user.id,
          token: this.generateToken(),
          type: 'access',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }
      });

      return {
        token: token.token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    });
  }

  async register(email: string, password: string, role: UserRole): Promise<LoginResponse> {
    return this.withTransaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        throw new APIError(400, 'USER_EXISTS', 'Email already registered');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role
        }
      });

      const token = await tx.authToken.create({
        data: {
          user_id: user.id,
          token: this.generateToken(),
          type: 'access',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      return {
        token: token.token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    });
  }

  async validateToken(token: string): Promise<{ id: string; email: string; role: UserRole }> {
    return this.withTransaction(async (tx) => {
      const authToken = await tx.authToken.findFirst({
        where: {
          token,
          revoked: false,
          expires_at: { gt: new Date() }
        }
      });

      if (!authToken) {
        throw new APIError(401, 'INVALID_TOKEN', 'Token is invalid or expired');
      }

      const user = await tx.user.findUnique({ where: { id: authToken.user_id } });
      if (!user) {
        throw new APIError(401, 'USER_NOT_FOUND', 'User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role
      };
    });
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Required by BaseService but not used in AuthService
  protected async findExactSKU(): Promise<null> {
    return null;
  }

  protected async findUniversalSKU(): Promise<null> {
    return null;
  }
} 