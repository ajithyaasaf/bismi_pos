import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest, verifyManagerOrOwnerPin } from '../../middleware/auth.js';

export const updateLiveRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, newSellingPrice, newCostPrice, pin, reason } = req.body;
    const shopId = req.user?.shopId;

    if (!productId || newSellingPrice === undefined) {
      res.status(400).json({ success: false, message: 'Product ID and new selling price are required.' });
      return;
    }

    // Role check: If Cashier is initiating, require Manager/Owner PIN
    let authorizedUserId = req.user!.id;
    if (req.user?.role === 'CASHIER' || req.user?.role === 'PREPARATION_WORKER') {
      if (!pin) {
        res.status(403).json({ success: false, message: 'Manager PIN is required for live price modifications.' });
        return;
      }
      const pinResult = await verifyManagerOrOwnerPin(shopId!, pin);
      if (!pinResult.valid) {
        res.status(403).json({ success: false, message: pinResult.error || 'Invalid Manager PIN.' });
        return;
      }
      authorizedUserId = pinResult.user!.id;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.shopId !== shopId) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const oldSellingPrice = product.currentSellingPrice;
    const oldCostPrice = product.currentCostPrice;
    const parsedNewSellingPrice = parseFloat(newSellingPrice);
    const parsedNewCostPrice = newCostPrice !== undefined ? parseFloat(newCostPrice) : oldCostPrice;

    // Update Product Record
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentSellingPrice: parsedNewSellingPrice,
        currentCostPrice: parsedNewCostPrice,
      },
    });

    // Close previous active price entry
    const now = new Date();
    await prisma.productPrice.updateMany({
      where: {
        productId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: now,
      },
    });

    // Create new price history record
    await prisma.productPrice.create({
      data: {
        productId,
        sellingPrice: parsedNewSellingPrice,
        costPrice: parsedNewCostPrice,
        effectiveFrom: now,
        createdById: authorizedUserId,
      },
    });

    // Create Immutable Audit Log
    await prisma.auditLog.create({
      data: {
        shopId: shopId!,
        userId: authorizedUserId,
        action: 'PRICE_CHANGE',
        entityName: 'Product',
        entityId: productId,
        oldValue: JSON.stringify({ name: product.name, sellingPrice: oldSellingPrice, costPrice: oldCostPrice }),
        newValue: JSON.stringify({ name: product.name, sellingPrice: parsedNewSellingPrice, costPrice: parsedNewCostPrice, reason: reason || 'Live Daily Rate Update' }),
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      message: `Price for ${product.name} updated: ₹${oldSellingPrice} ➔ ₹${parsedNewSellingPrice}`,
      data: updatedProduct,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPriceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId as string;

    const history = await prisma.productPrice.findMany({
      where: { productId },
      orderBy: { effectiveFrom: 'desc' },
      take: 30,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
