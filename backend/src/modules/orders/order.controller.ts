import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { generateDailyOrderNumber } from '../../utils/invoice.js';

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { customerId, customerName, items, status, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
      return;
    }

    const dailyOrderNumber = await generateDailyOrderNumber(shopId!);
    const orderStatus = status || 'PREPARING';

    let totalEstimatedAmount = 0;

    const orderItemsData = items.map((item: any) => {
      const weight = item.requestedWeight ? parseFloat(item.requestedWeight) : null;
      const qty = item.quantity ? parseFloat(item.quantity) : 1;
      const unitPrice = parseFloat(item.unitPrice);
      const costPrice = parseFloat(item.costPrice || 0);
      const cuttingCharge = parseFloat(item.cuttingCharge || 0);

      const baseAmount = weight !== null ? weight * unitPrice : qty * unitPrice;
      const itemTotal = baseAmount + cuttingCharge;
      totalEstimatedAmount += itemTotal;

      return {
        productId: item.productId,
        optionId: item.optionId || null,
        productName: item.productName,
        unitPrice,
        costPrice,
        requestedWeight: weight,
        finalWeight: item.finalWeight ? parseFloat(item.finalWeight) : weight,
        quantity: qty,
        cuttingCharge,
        itemTotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        shopId: shopId!,
        dailyOrderNumber,
        status: orderStatus,
        customerId: customerId || null,
        customerName: customerName || 'Walk-in Customer',
        totalEstimatedAmount,
        totalFinalAmount: totalEstimatedAmount,
        notes: notes || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { option: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Order #${order.dailyOrderNumber} created successfully.`,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const holdOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { orderId, items, customerName, notes } = req.body;

    if (orderId) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'HELD', notes },
        include: { items: true },
      });
      res.json({ success: true, message: `Order #${updated.dailyOrderNumber} placed on hold.`, data: updated });
      return;
    }

    // If no existing order, create a new HELD order
    if (!items || items.length === 0) {
      res.status(400).json({ success: false, message: 'No items in cart to hold.' });
      return;
    }

    const dailyOrderNumber = await generateDailyOrderNumber(shopId!);
    let totalEstimatedAmount = 0;

    const orderItemsData = items.map((item: any) => {
      const weight = item.requestedWeight ? parseFloat(item.requestedWeight) : null;
      const qty = item.quantity ? parseFloat(item.quantity) : 1;
      const unitPrice = parseFloat(item.unitPrice);
      const cuttingCharge = parseFloat(item.cuttingCharge || 0);
      const baseAmount = weight !== null ? weight * unitPrice : qty * unitPrice;
      const itemTotal = baseAmount + cuttingCharge;
      totalEstimatedAmount += itemTotal;

      return {
        productId: item.productId,
        optionId: item.optionId || null,
        productName: item.productName,
        unitPrice,
        costPrice: parseFloat(item.costPrice || 0),
        requestedWeight: weight,
        finalWeight: weight,
        quantity: qty,
        cuttingCharge,
        itemTotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        shopId: shopId!,
        dailyOrderNumber,
        status: 'HELD',
        customerName: customerName || 'Walk-in Customer',
        totalEstimatedAmount,
        totalFinalAmount: totalEstimatedAmount,
        notes: notes || 'Held by cashier',
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

    res.status(201).json({
      success: true,
      message: `Bill #${order.dailyOrderNumber} placed on hold.`,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeldOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const heldOrders = await prisma.order.findMany({
      where: {
        shopId,
        status: 'HELD',
      },
      include: {
        items: {
          include: { option: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: heldOrders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({
      success: true,
      message: `Order #${updated.dailyOrderNumber} cancelled.`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
