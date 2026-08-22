import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const users = await prisma.user.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { name, username, password, pin, role } = req.body;

    if (!name || !username || !password || !pin) {
      res.status(400).json({ success: false, message: 'Name, username, password, and 4-digit PIN are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Username already taken.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        shopId: shopId!,
        name,
        username,
        passwordHash,
        pinHash,
        role: role || 'CASHIER',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Staff member ${user.name} created.`,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserPin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { newPin } = req.body;

    if (!newPin || newPin.length < 4) {
      res.status(400).json({ success: false, message: 'PIN must be at least 4 digits.' });
      return;
    }

    const pinHash = await bcrypt.hash(newPin, 10);

    await prisma.user.update({
      where: { id },
      data: { pinHash, failedPins: 0, lockedUntil: null },
    });

    res.json({
      success: true,
      message: 'Staff PIN updated successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
