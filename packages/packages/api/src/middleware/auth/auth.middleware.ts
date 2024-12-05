import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { APIError } from '../../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new APIError(401, 'AUTH_002', 'No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded as any;
    next();
  } catch (error) {
    next(new APIError(401, 'AUTH_003', 'Invalid token'));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new APIError(401, 'AUTH_004', 'Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new APIError(403, 'AUTH_005', 'Not authorized'));
    }

    next();
  };
}; 