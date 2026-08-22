import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { prisma } from '../database/index.js';

export interface AuthenticatedUser {
  id: string;
  shopId: string;
  name: string;
  username: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'PREPARATION_WORKER';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, shopId: true, name: true, username: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ success: false, message: 'User account is inactive or revoked.' });
      return;
    }

    req.user = {
      id: user.id,
      shopId: user.shopId,
      name: user.name,
      username: user.username,
      role: user.role as AuthenticatedUser['role'],
    };
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized request.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
};

export const verifyManagerOrOwnerPin = async (
  shopId: string,
  pin: string
): Promise<{ valid: boolean; user?: { id: string; name: string; role: string }; error?: string }> => {
  if (!pin || pin.length < 4) {
    return { valid: false, error: 'PIN must be at least 4 digits.' };
  }

  // Find owners and managers for this shop
  const managers = await prisma.user.findMany({
    where: {
      shopId,
      role: { in: ['OWNER', 'MANAGER'] },
      isActive: true,
    },
  });

  const now = new Date();

  for (const manager of managers) {
    // Check if locked out
    if (manager.lockedUntil && manager.lockedUntil > now) {
      continue;
    }

    const isMatch = await bcrypt.compare(pin, manager.pinHash);
    if (isMatch) {
      // Reset failed counter
      if (manager.failedPins > 0) {
        await prisma.user.update({
          where: { id: manager.id },
          data: { failedPins: 0, lockedUntil: null },
        });
      }
      return { valid: true, user: { id: manager.id, name: manager.name, role: manager.role } };
    }
  }

  return { valid: false, error: 'Invalid Manager/Owner authorization PIN.' };
};
