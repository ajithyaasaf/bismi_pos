import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { EscPosBuilder, ReceiptData } from '../../utils/escpos.js';

export const getHardwareConfigs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const configs = await prisma.printerConfig.findMany({
      where: { shopId },
      orderBy: { isDefault: 'desc' },
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const savePrinterConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { name, adapterType, connectionStr, paperWidth, autoCut, openDrawer, isDefault } = req.body;

    if (!name || !adapterType) {
      res.status(400).json({ success: false, message: 'Printer name and adapter type are required.' });
      return;
    }

    if (isDefault) {
      await prisma.printerConfig.updateMany({
        where: { shopId },
        data: { isDefault: false },
      });
    }

    const config = await prisma.printerConfig.create({
      data: {
        shopId: shopId!,
        name,
        adapterType,
        connectionStr: connectionStr || 'USB',
        paperWidth: paperWidth || '80mm',
        autoCut: autoCut !== false,
        openDrawer: openDrawer !== false,
        isDefault: isDefault !== false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Printer configuration saved successfully.',
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateTestReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paperWidth = '80mm' } = req.body;

    const testData: ReceiptData = {
      shopName: 'BISMI POS HARDWARE TEST',
      branchName: 'Thermal Printer Diagnostic Utility',
      address: 'Testing ESC/POS Protocol & Character Grid',
      phone: '+91 98401 23456',
      gstin: '33TEST9999Z1Z0',
      invoiceNumber: 'TEST-DIAGNOSTIC-001',
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      cashierName: req.user!.name,
      customerName: 'Hardware Diagnostic Check',
      items: [
        { name: '1. Text Alignment & Bolding', weightOrQty: 'PASS', rate: 1.00, total: 1.00 },
        { name: '2. Currency Symbol (₹)', weightOrQty: 'PASS', rate: 220.50, total: 220.50 },
        { name: '3. Decimal Weight Format', weightOrQty: '1.820 KG', rate: 100.00, total: 182.00 },
        { name: '4. Cutting Modifier Test', weightOrQty: 'Curry Cut', rate: 10.00, cuttingName: 'Extra Cut', total: 10.00 },
      ],
      subtotal: 413.50,
      discount: 0,
      tax: 0,
      rounding: 0.50,
      grandTotal: 414.00,
      paymentMethod: 'TEST_MODE',
      receiptFooter: '✓ ALL HARDWARE PERIPHERALS WORKING PROPERLY',
      paperWidth: paperWidth as any,
    };

    const builder = new EscPosBuilder(paperWidth as any);
    const { rawEscPos, plainText } = builder.generateReceipt(testData, { kickDrawer: true, cut: true });

    res.json({
      success: true,
      message: 'Diagnostic test receipt generated.',
      data: {
        plainText,
        rawEscPosBase64: Buffer.from(rawEscPos, 'binary').toString('base64'),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
