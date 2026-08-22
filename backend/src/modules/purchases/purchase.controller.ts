import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const purchases = await prisma.purchase.findMany({
      where: { shopId },
      orderBy: { purchaseDate: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: purchases,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { supplierName, invoiceNo, items, totalAmount, notes } = req.body;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Supplier name and purchase line items are required.' });
      return;
    }

    const parsedTotal = parseFloat(totalAmount);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          shopId: shopId!,
          supplierName,
          invoiceNo: invoiceNo || null,
          totalAmount: parsedTotal,
          notes: notes || null,
        },
      });

      for (const item of items) {
        const qty = parseFloat(item.quantity);
        const cost = parseFloat(item.unitCost);

        // Update inventory stock
        await tx.inventoryItem.upsert({
          where: { productId: item.productId },
          update: {
            currentStockKg: { increment: item.unit === 'KG' ? qty : 0 },
            currentStockUnits: { increment: item.unit !== 'KG' ? qty : 0 },
          },
          create: {
            shopId: shopId!,
            productId: item.productId,
            currentStockKg: item.unit === 'KG' ? qty : 0,
            currentStockUnits: item.unit !== 'KG' ? qty : 0,
          },
        });

        // Record Inventory Inward Transaction
        await tx.inventoryTransaction.create({
          data: {
            shopId: shopId!,
            productId: item.productId,
            type: 'PURCHASE',
            quantityKg: qty,
            unitCost: cost,
            reason: `Supplier Inward: ${supplierName} (${invoiceNo || 'Batch'})`,
            createdById: req.user!.id,
          },
        });
      }

      return purchase;
    });

    res.status(201).json({
      success: true,
      message: `Inward purchase batch from ${supplierName} recorded successfully.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
