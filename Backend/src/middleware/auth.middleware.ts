import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util.js';
import { prisma } from '../lib/prisma.js';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        message: 'Authentication required'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      },
      include: {
        role: true
      }
    });

    if (!user) {
      res.status(401).json({
        message: 'User not found'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: 'Invalid or expired token'
    });
    return;
  }
};