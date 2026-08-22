import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { startDate, endDate } = req.query;

    const whereClause: any = { shopId };
    if (startDate || endDate) {
      whereClause.expenseDate = {};
      if (startDate) whereClause.expenseDate.gte = new Date(startDate as string);
      if (endDate) whereClause.expenseDate.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { category, amount, paymentMode = 'CASH', description } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!category || !parsedAmount || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Expense category and valid amount are required.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          shopId: shopId!,
          category,
          amount: parsedAmount,
          paymentMode,
          description: description || null,
          createdById: req.user!.id,
        },
      });

      // If paid via CASH, update active cash register session
      if (paymentMode === 'CASH') {
        const session = await tx.cashSession.findFirst({
          where: { shopId, status: 'OPEN' },
        });
        if (session) {
          await tx.cashSession.update({
            where: { id: session.id },
            data: {
              totalCashExpenses: { increment: parsedAmount },
              expectedCash: { decrement: parsedAmount },
            },
          });
        }
      }

      return exp;
    });

    res.status(201).json({
      success: true,
      message: `Expense of ₹${parsedAmount.toFixed(2)} (${category}) recorded.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
