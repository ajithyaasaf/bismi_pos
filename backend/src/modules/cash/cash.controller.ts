import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest, verifyManagerOrOwnerPin } from '../../middleware/auth.js';

export const getActiveCashSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const session = await prisma.cashSession.findFirst({
      where: { shopId, status: 'OPEN' },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const openCashSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { openingCash, notes } = req.body;

    const existing = await prisma.cashSession.findFirst({
      where: { shopId, status: 'OPEN' },
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'An active cash session is already open.' });
      return;
    }

    const floatAmount = parseFloat(openingCash || '0');

    const session = await prisma.cashSession.create({
      data: {
        shopId: shopId!,
        userId: req.user!.id,
        openingCash: floatAmount,
        expectedCash: floatAmount,
        status: 'OPEN',
        notes: notes || 'Register opened',
      },
    });

    res.status(201).json({
      success: true,
      message: `Cash session opened with float of ₹${floatAmount.toFixed(2)}.`,
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeDayRegister = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { actualCash, notes, pin } = req.body;

    if (actualCash === undefined) {
      res.status(400).json({ success: false, message: 'Counted physical cash amount is required.' });
      return;
    }

    if (!pin) {
      res.status(403).json({ success: false, message: 'Manager PIN is required to close the business day.' });
      return;
    }

    const pinRes = await verifyManagerOrOwnerPin(shopId!, pin);
    if (!pinRes.valid) {
      res.status(403).json({ success: false, message: pinRes.error || 'Invalid Manager PIN.' });
      return;
    }

    const session = await prisma.cashSession.findFirst({
      where: { shopId, status: 'OPEN' },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'No active cash session found to close.' });
      return;
    }

    const countedCash = parseFloat(actualCash);
    const difference = countedCash - session.expectedCash;

    // Fetch Today's totals for Z-Report
    const startOfShift = session.openedAt;
    const now = new Date();

    const [salesSummary, upiPayments] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId, createdAt: { gte: startOfShift, lte: now }, status: 'COMPLETED' },
        _sum: { finalAmount: true, discountAmount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { method: 'UPI', createdAt: { gte: startOfShift, lte: now } },
        _sum: { amount: true },
      }),
    ]);

    const updatedSession = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closedAt: now,
        actualCash: countedCash,
        difference,
        status: 'CLOSED',
        notes: notes || `Day closed by ${pinRes.user!.name}`,
      },
    });

    // Write to Audit Log
    await prisma.auditLog.create({
      data: {
        shopId: shopId!,
        userId: pinRes.user!.id,
        action: 'DAY_CLOSE',
        entityName: 'CashSession',
        entityId: session.id,
        newValue: JSON.stringify({
          openingCash: session.openingCash,
          expectedCash: session.expectedCash,
          actualCash: countedCash,
          difference,
          totalBills: salesSummary._count.id,
          totalSales: salesSummary._sum.finalAmount || 0,
          upiTotal: upiPayments._sum.amount || 0,
        }),
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      message: `Register closed. Cash difference: ₹${difference.toFixed(2)}`,
      data: {
        session: updatedSession,
        zReport: {
          shiftStart: session.openedAt,
          shiftEnd: now,
          openingCash: session.openingCash,
          cashSales: session.totalCashSales,
          cashExpenses: session.totalCashExpenses,
          expectedCash: session.expectedCash,
          actualCash: countedCash,
          difference,
          totalBills: salesSummary._count.id,
          totalRevenue: salesSummary._sum.finalAmount || 0,
          upiRevenue: upiPayments._sum.amount || 0,
          approvedBy: pinRes.user!.name,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
