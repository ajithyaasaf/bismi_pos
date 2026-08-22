import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest, verifyManagerOrOwnerPin } from '../../middleware/auth.js';

export const getInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;

    const inventory = await prisma.inventoryItem.findMany({
      where: { shopId },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameLocal: true,
            category: true,
            pricingType: true,
            unit: true,
            currentSellingPrice: true,
            currentCostPrice: true,
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordWastage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { productId, quantityKg, reason, pin } = req.body;

    const parsedQty = parseFloat(quantityKg);
    if (!productId || !parsedQty || parsedQty <= 0) {
      res.status(400).json({ success: false, message: 'Product ID and wastage quantity are required.' });
      return;
    }

    let authorizedUserId = req.user!.id;
    // If quantity is above 2 KG, require Manager PIN
    if (parsedQty > 2.0) {
      if (!pin) {
        res.status(403).json({ success: false, message: 'Wastage above 2 KG requires Manager PIN authorization.' });
        return;
      }
      const pinRes = await verifyManagerOrOwnerPin(shopId!, pin);
      if (!pinRes.valid) {
        res.status(403).json({ success: false, message: pinRes.error || 'Invalid Manager PIN.' });
        return;
      }
      authorizedUserId = pinRes.user!.id;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { productId },
        data: {
          currentStockKg: { decrement: parsedQty },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          shopId: shopId!,
          productId,
          type: 'WASTAGE_SPOILAGE',
          quantityKg: parsedQty,
          unitCost: product.currentCostPrice,
          reason: reason || 'Dressing yield loss / Spoilage',
          createdById: authorizedUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: shopId!,
          userId: authorizedUserId,
          action: 'STOCK_ADJUST',
          entityName: 'InventoryItem',
          entityId: productId,
          newValue: JSON.stringify({ type: 'WASTAGE', quantityKg: parsedQty, reason }),
          ipAddress: req.ip,
        },
      });
    });

    res.json({
      success: true,
      message: `Recorded ${parsedQty} KG wastage for ${product.name}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { productId, actualPhysicalKg, actualPhysicalUnits, reason, pin } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required.' });
      return;
    }

    if (!pin) {
      res.status(403).json({ success: false, message: 'Manager PIN is required for manual stock adjustments.' });
      return;
    }

    const pinRes = await verifyManagerOrOwnerPin(shopId!, pin);
    if (!pinRes.valid) {
      res.status(403).json({ success: false, message: pinRes.error || 'Invalid Manager PIN.' });
      return;
    }

    const inv = await prisma.inventoryItem.findUnique({ where: { productId }, include: { product: true } });
    if (!inv) {
      res.status(404).json({ success: false, message: 'Inventory item not found.' });
      return;
    }

    const newKg = actualPhysicalKg !== undefined ? parseFloat(actualPhysicalKg) : inv.currentStockKg;
    const newUnits = actualPhysicalUnits !== undefined ? parseFloat(actualPhysicalUnits) : inv.currentStockUnits;

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { productId },
        data: {
          currentStockKg: newKg,
          currentStockUnits: newUnits,
          lastReconciledAt: new Date(),
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          shopId: shopId!,
          productId,
          type: 'MANUAL_ADJUSTMENT',
          quantityKg: newKg - inv.currentStockKg,
          unitCost: inv.product.currentCostPrice,
          reason: reason || 'Physical stock count adjustment',
          createdById: pinRes.user!.id,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: shopId!,
          userId: pinRes.user!.id,
          action: 'STOCK_ADJUST',
          entityName: 'InventoryItem',
          entityId: productId,
          oldValue: JSON.stringify({ currentStockKg: inv.currentStockKg, currentStockUnits: inv.currentStockUnits }),
          newValue: JSON.stringify({ currentStockKg: newKg, currentStockUnits: newUnits, reason }),
          ipAddress: req.ip,
        },
      });
    });

    res.json({
      success: true,
      message: `Stock reconciled for ${inv.product.name}. Physical: ${newKg} KG`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
