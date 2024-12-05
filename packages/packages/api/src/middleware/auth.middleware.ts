import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.get('authorization');
    console.log('Auth header:', authHeader); // Debug

    if (!authHeader) {
      return next(new APIError(401, 'UNAUTHORIZED', 'No token provided'));
    }

    // Check token format
    const [type, token] = authHeader.split(' ');
    console.log('Token type:', type, 'Token:', token); // Debug

    if (type !== 'Bearer' || !token) {
      return next(new APIError(401, 'UNAUTHORIZED', 'Invalid token format'));
    }

    // Find token in database
    const authToken = await prisma.authToken.findUnique({
      where: { token },
      include: { user: true }
    });
    console.log('Found token:', authToken); // Debug

    if (!authToken) {
      return next(new APIError(401, 'UNAUTHORIZED', 'Token not found'));
    }

    // Check if token is expired
    if (authToken.expires_at < new Date()) {
      return next(new APIError(401, 'UNAUTHORIZED', 'Token expired'));
    }

    // Check if token is revoked
    if (authToken.revoked) {
      return next(new APIError(401, 'UNAUTHORIZED', 'Token revoked'));
    }

    // Check if user exists and is active
    if (!authToken.user) {
      return next(new APIError(401, 'UNAUTHORIZED', 'User not found or inactive'));
    }

    // Attach user to request
    req.user = authToken.user;
    next();
  } catch (error) {
    console.error('Auth error:', error); // Debug
    next(new APIError(500, 'SERVER_ERROR', 'Authentication failed'));
  }
}; 