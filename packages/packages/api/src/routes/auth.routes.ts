import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import bcrypt from 'bcryptjs';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

// Login route
router.post(
  '/login',
  validationMiddleware({ body: loginSchema }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new APIError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new APIError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Create access token
      const token = await prisma.authToken.create({
        data: {
          user_id: user.id,
          type: 'access',
          token: `access_${Math.random().toString(36).slice(2)}`,
          expires_at: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      res.json({
        token: token.token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Token refresh route
router.post(
  '/refresh',
  validationMiddleware({ body: refreshSchema }),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      // Find refresh token
      const oldToken = await prisma.authToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!oldToken) {
        throw new APIError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      if (oldToken.revoked) {
        throw new APIError(401, 'TOKEN_REVOKED', 'Token has been revoked');
      }

      if (oldToken.expires_at < new Date()) {
        throw new APIError(401, 'TOKEN_EXPIRED', 'Token has expired');
      }

      // Create new access token
      const newToken = await prisma.authToken.create({
        data: {
          user_id: oldToken.user_id,
          type: 'access',
          token: `access_${Math.random().toString(36).slice(2)}`,
          expires_at: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      res.json({
        token: newToken.token
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRoutes }; 