import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/index.js';
import { config } from '../../config/index.js';
import { AuthenticatedRequest, verifyManagerOrOwnerPin } from '../../middleware/auth.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { shop: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials or inactive user account.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    // Generate JWT Tokens
    const tokenPayload = {
      id: user.id,
      shopId: user.shopId,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '12h' });
    const refreshToken = jwt.sign(tokenPayload, config.jwtRefreshSecret, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        shop: {
          id: user.shop.id,
          name: user.shop.name,
          branchName: user.shop.branchName,
          address: user.shop.address,
          phone: user.shop.phone,
          gstin: user.shop.gstin,
          autoPrintReceipt: user.shop.autoPrintReceipt,
          paperSize: user.shop.paperSize,
          soundEnabled: user.shop.soundEnabled,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId, pin, requiredRoles } = req.body;

    if (!shopId || !pin) {
      res.status(400).json({ success: false, message: 'Shop ID and PIN are required.' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        shopId,
        isActive: true,
        ...(requiredRoles && requiredRoles.length > 0 ? { role: { in: requiredRoles } } : {}),
      },
    });

    const now = new Date();

    for (const user of users) {
      if (user.lockedUntil && user.lockedUntil > now) {
        continue; // Account locked
      }

      const isMatch = await bcrypt.compare(pin, user.pinHash);
      if (isMatch) {
        // Reset failed PIN count
        if (user.failedPins > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedPins: 0, lockedUntil: null },
          });
        }

        const token = jwt.sign(
          { id: user.id, shopId: user.shopId, name: user.name, username: user.username, role: user.role },
          config.jwtSecret,
          { expiresIn: '12h' }
        );

        res.json({
          success: true,
          message: 'PIN verified successfully.',
          data: {
            token,
            user: { id: user.id, name: user.name, username: user.username, role: user.role },
          },
        });
        return;
      }
    }

    res.status(401).json({ success: false, message: 'Invalid PIN entered.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyManagerAuth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { pin, actionName } = req.body;
    const shopId = req.user?.shopId;

    if (!shopId) {
      res.status(401).json({ success: false, message: 'Shop context missing.' });
      return;
    }

    const result = await verifyManagerOrOwnerPin(shopId, pin);
    if (!result.valid) {
      res.status(403).json({ success: false, message: result.error || 'Manager authorization failed.' });
      return;
    }

    // Log the sensitive action authorization
    await prisma.auditLog.create({
      data: {
        shopId,
        userId: result.user!.id,
        action: 'SENSITIVE_OVERRIDE_APPROVED',
        entityName: 'SECURITY',
        entityId: result.user!.id,
        newValue: JSON.stringify({ action: actionName || 'MANAGER_OVERRIDE', approvedBy: result.user!.name }),
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      message: `Authorized by ${result.user!.name} (${result.user!.role}).`,
      data: { authorizedBy: result.user },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { shop: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, username: user.username, role: user.role },
        shop: user.shop,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
