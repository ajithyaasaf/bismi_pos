import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getDashboardMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      todaySalesAgg,
      todayPayments,
      todayExpensesAgg,
      totalChickenSoldAgg,
      lowStockItems,
      totalOutstandingCreditAgg,
      activeCashSession,
      recentSales,
    ] = await Promise.all([
      // Sales Aggregate Today
      prisma.sale.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfToday, lt: endOfToday },
          status: 'COMPLETED',
        },
        _sum: {
          finalAmount: true,
          grossProfit: true,
          costAmount: true,
          discountAmount: true,
        },
        _count: { id: true },
      }),

      // Today Payments by Method
      prisma.payment.groupBy({
        by: ['method'],
        where: {
          sale: { shopId, createdAt: { gte: startOfToday, lt: endOfToday }, status: 'COMPLETED' },
        },
        _sum: { amount: true },
      }),

      // Today Expenses
      prisma.expense.aggregate({
        where: {
          shopId,
          expenseDate: { gte: startOfToday, lt: endOfToday },
        },
        _sum: { amount: true },
      }),

      // Total Chicken Sold in KG today
      prisma.saleItem.aggregate({
        where: {
          sale: { shopId, createdAt: { gte: startOfToday, lt: endOfToday }, status: 'COMPLETED' },
          unit: 'KG',
        },
        _sum: { finalWeight: true },
      }),

      // Low Stock Alert Items
      prisma.inventoryItem.findMany({
        where: {
          shopId,
          OR: [
            { currentStockKg: { lte: 15.0 } },
            { currentStockUnits: { lte: 20.0 } },
          ],
        },
        include: { product: true },
        take: 10,
      }),

      // Total Outstanding Credit in Market
      prisma.customer.aggregate({
        where: { shopId, creditBalance: { gt: 0 } },
        _sum: { creditBalance: true },
        _count: { id: true },
      }),

      // Active Cash Session
      prisma.cashSession.findFirst({
        where: { shopId, status: 'OPEN' },
      }),

      // Recent 5 Sales
      prisma.sale.findMany({
        where: { shopId, status: 'COMPLETED' },
        include: { customer: true, cashier: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalSales = todaySalesAgg._sum.finalAmount || 0;
    const grossProfit = todaySalesAgg._sum.grossProfit || 0;
    const totalExpenses = todayExpensesAgg._sum.amount || 0;
    const estimatedNetProfit = grossProfit - totalExpenses;
    const totalBills = todaySalesAgg._count.id;
    const averageBillValue = totalBills > 0 ? totalSales / totalBills : 0;
    const totalChickenKg = totalChickenSoldAgg._sum.finalWeight || 0;

    const cashCollected = todayPayments.find((p) => p.method === 'CASH')?._sum.amount || 0;
    const upiCollected = todayPayments.find((p) => p.method === 'UPI')?._sum.amount || 0;
    const cardCollected = todayPayments.find((p) => p.method === 'CARD')?._sum.amount || 0;
    const creditIssued = todayPayments.find((p) => p.method === 'CREDIT')?._sum.amount || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          grossProfit,
          totalExpenses,
          estimatedNetProfit,
          totalBills,
          averageBillValue,
          totalChickenKg,
        },
        paymentsBreakdown: {
          cash: cashCollected,
          upi: upiCollected,
          card: cardCollected,
          credit: creditIssued,
        },
        cashDrawer: {
          isOpen: !!activeCashSession,
          openingCash: activeCashSession?.openingCash || 0,
          expectedCash: activeCashSession?.expectedCash || 0,
          totalCashSales: activeCashSession?.totalCashSales || 0,
        },
        creditSummary: {
          totalOutstanding: totalOutstandingCreditAgg._sum.creditBalance || 0,
          debtorCount: totalOutstandingCreditAgg._count.id,
        },
        lowStockItems: lowStockItems.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          currentStockKg: item.currentStockKg,
          currentStockUnits: item.currentStockUnits,
          unit: item.product.unit,
        })),
        recentSales,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
