import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getShopDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { printerConfigs: true },
    });

    if (!shop) {
      res.status(404).json({ success: false, message: 'Shop not found.' });
      return;
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShopSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { name, branchName, address, phone, gstin, receiptHeader, receiptFooter, autoPrintReceipt, paperSize, soundEnabled } = req.body;

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(name && { name }),
        ...(branchName !== undefined && { branchName }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(gstin !== undefined && { gstin }),
        ...(receiptHeader !== undefined && { receiptHeader }),
        ...(receiptFooter !== undefined && { receiptFooter }),
        ...(autoPrintReceipt !== undefined && { autoPrintReceipt }),
        ...(paperSize && { paperSize }),
        ...(soundEnabled !== undefined && { soundEnabled }),
      },
    });

    res.json({
      success: true,
      message: 'Shop settings updated successfully.',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
