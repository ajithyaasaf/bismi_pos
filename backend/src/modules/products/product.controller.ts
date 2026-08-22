import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    if (!shopId) {
      res.status(401).json({ success: false, message: 'Shop context missing.' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      include: {
        options: {
          where: { isActive: true },
        },
        inventoryItem: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const {
      code,
      name,
      nameLocal,
      category,
      pricingType,
      unit,
      sellingPrice,
      costPrice,
      warningWeightLimit,
      criticalWeightLimit,
      isQuickSelect,
      options,
    } = req.body;

    if (!code || !name || sellingPrice === undefined) {
      res.status(400).json({ success: false, message: 'Product code, name, and selling price are required.' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        shopId: shopId!,
        code,
        name,
        nameLocal,
        category: category || 'Fresh Meat',
        pricingType: pricingType || 'WEIGHT_BASED',
        unit: unit || 'KG',
        currentSellingPrice: parseFloat(sellingPrice),
        currentCostPrice: parseFloat(costPrice || 0),
        warningWeightLimit: parseFloat(warningWeightLimit || 5.0),
        criticalWeightLimit: parseFloat(criticalWeightLimit || 10.0),
        isQuickSelect: isQuickSelect !== false,
        options: {
          create: (options || []).map((opt: any) => ({
            name: opt.name,
            extraCharge: parseFloat(opt.extraCharge || 0),
            isDefault: opt.isDefault || false,
          })),
        },
        inventoryItem: {
          create: {
            shopId: shopId!,
            currentStockKg: 0,
            currentStockUnits: 0,
            lowStockThreshold: 10,
          },
        },
      },
      include: { options: true, inventoryItem: true },
    });

    // Record initial price history
    await prisma.productPrice.create({
      data: {
        productId: product.id,
        sellingPrice: parseFloat(sellingPrice),
        costPrice: parseFloat(costPrice || 0),
        createdById: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      name,
      nameLocal,
      category,
      warningWeightLimit,
      criticalWeightLimit,
      isQuickSelect,
      displayOrder,
      isActive,
      options,
    } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(nameLocal !== undefined && { nameLocal }),
        ...(category && { category }),
        ...(warningWeightLimit !== undefined && { warningWeightLimit: parseFloat(warningWeightLimit) }),
        ...(criticalWeightLimit !== undefined && { criticalWeightLimit: parseFloat(criticalWeightLimit) }),
        ...(isQuickSelect !== undefined && { isQuickSelect }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { options: true },
    });

    // If options provided, update options
    if (options && Array.isArray(options)) {
      // Deactivate existing
      await prisma.productOption.updateMany({
        where: { productId: id },
        data: { isActive: false },
      });

      for (const opt of options) {
        if (opt.id) {
          await prisma.productOption.update({
            where: { id: opt.id },
            data: {
              name: opt.name,
              extraCharge: parseFloat(opt.extraCharge || 0),
              isDefault: opt.isDefault || false,
              isActive: true,
            },
          });
        } else {
          await prisma.productOption.create({
            data: {
              productId: id,
              name: opt.name,
              extraCharge: parseFloat(opt.extraCharge || 0),
              isDefault: opt.isDefault || false,
              isActive: true,
            },
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
