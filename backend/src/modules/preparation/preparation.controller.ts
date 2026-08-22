import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../database/index.js';

export const getPreparationQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const orders = await prisma.order.findMany({
      where: {
        shopId,
        status: { in: ['PENDING', 'PREPARING'] },
      },
      include: {
        items: {
          include: {
            option: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReadyOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const orders = await prisma.order.findMany({
      where: {
        shopId,
        status: 'READY',
      },
      include: {
        items: {
          include: {
            option: true,
          },
        },
      },
      orderBy: { readyAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markOrderReady = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { itemsFinalWeights } = req.body; // Array of { itemId, finalWeight }

    const order: any = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    let totalFinalAmount = 0;

    // Update item weights
    for (const item of order.items) {
      let finalWeight = item.requestedWeight;

      if (itemsFinalWeights && Array.isArray(itemsFinalWeights)) {
        const match = itemsFinalWeights.find((w: any) => w.itemId === item.id);
        if (match && match.finalWeight !== undefined) {
          finalWeight = parseFloat(match.finalWeight);
        }
      }

      const weightOrQty = finalWeight !== null && finalWeight !== undefined ? finalWeight : item.quantity;
      const calculatedItemTotal = (weightOrQty * item.unitPrice) + item.cuttingCharge;
      totalFinalAmount += calculatedItemTotal;

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          finalWeight,
          itemTotal: calculatedItemTotal,
          isPrepared: true,
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'READY',
        totalFinalAmount,
        readyAt: new Date(),
      },
      include: {
        items: {
          include: { option: true },
        },
      },
    });

    res.json({
      success: true,
      message: `Order #${updatedOrder.dailyOrderNumber} marked as READY.`,
      data: updatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
