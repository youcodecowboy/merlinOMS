import { Request, Response, NextFunction } from 'express';
import { APIError } from './error-handler';
import jwt from 'jsonwebtoken';

export const authenticate = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    throw new APIError(401, 'UNAUTHORIZED', 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    throw new APIError(401, 'UNAUTHORIZED', 'Invalid token');
  }
}; 