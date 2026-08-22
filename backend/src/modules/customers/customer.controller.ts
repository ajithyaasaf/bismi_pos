import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { search } = req.query;

    const whereClause: any = { shopId, isActive: true };
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { name, phone, address, creditLimit } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone number are required.' });
      return;
    }

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A customer with this phone number already exists.' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shopId!,
        name,
        phone,
        address: address || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 5000,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      data: customer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerCreditLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        creditTx: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const collectCreditRepayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amount, notes, paymentMode = 'CASH' } = req.body;
    const cashierId = req.user?.id;
    const shopId = req.user?.shopId;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid repayment amount is required.' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    const newBalance = Math.max(0, customer.creditBalance - parsedAmount);

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { creditBalance: newBalance },
      });

      await tx.creditTransaction.create({
        data: {
          customerId: id,
          type: 'REPAYMENT_RECEIVED',
          amount: parsedAmount,
          balanceAfter: newBalance,
          notes: notes || `Repayment via ${paymentMode}`,
          createdById: cashierId!,
        },
      });

      // If cash repayment, increment cash session
      if (paymentMode === 'CASH') {
        const activeSession = await tx.cashSession.findFirst({
          where: { shopId, status: 'OPEN' },
        });
        if (activeSession) {
          await tx.cashSession.update({
            where: { id: activeSession.id },
            data: {
              totalCashSales: { increment: parsedAmount },
              expectedCash: { increment: parsedAmount },
            },
          });
        }
      }
    });

    res.json({
      success: true,
      message: `Collected ₹${parsedAmount.toFixed(2)} from ${customer.name}. New Due: ₹${newBalance.toFixed(2)}`,
      data: { newBalance },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
