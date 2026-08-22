import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../database/index.js';
import { EscPosBuilder, ReceiptData } from '../../utils/escpos.js';

export const getPrintQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const pendingJobs = await prisma.printJob.findMany({
      where: {
        shopId,
        status: { in: ['QUEUED', 'FAILED'] },
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: pendingJobs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reprintSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const shopId = req.user?.shopId;

    const sale: any = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        customer: true,
        cashier: true,
        shop: true,
      },
    });

    if (!sale || sale.shopId !== shopId) {
      res.status(404).json({ success: false, message: 'Sale record not found.' });
      return;
    }

    const receiptData: ReceiptData = {
      shopName: sale.shop.name,
      branchName: sale.shop.branchName || undefined,
      address: sale.shop.address,
      phone: sale.shop.phone,
      gstin: sale.shop.gstin || undefined,
      invoiceNumber: `${sale.invoiceNumber} (REPRINT)`,
      date: new Date(sale.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      cashierName: sale.cashier.name,
      customerName: sale.customer?.name || 'Walk-in Customer',
      items: sale.items.map((si: any) => ({
        name: si.productName,
        weightOrQty: si.finalWeight !== null ? `${si.finalWeight.toFixed(3)} KG` : `${si.quantity} Units`,
        rate: si.unitPrice,
        cuttingName: si.cuttingName || undefined,
        cuttingCharge: si.cuttingCharge,
        total: si.totalPrice,
      })),
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      tax: sale.taxAmount,
      rounding: sale.roundingAmount,
      grandTotal: sale.finalAmount,
      paymentMethod: sale.payments.map((p: any) => p.method).join(' + '),
      cashReceived: sale.payments.find((p: any) => p.method === 'CASH')?.cashReceived || undefined,
      cashChange: sale.payments.find((p: any) => p.method === 'CASH')?.cashChange || undefined,
      receiptFooter: sale.shop.receiptFooter || undefined,
      paperWidth: (sale.shop.paperSize as any) || '80mm',
    };

    const builder = new EscPosBuilder(receiptData.paperWidth);
    const { rawEscPos, plainText } = builder.generateReceipt(receiptData, { kickDrawer: false, cut: true });

    // Create a new PrintJob without affecting financial figures
    const printJob = await prisma.printJob.create({
      data: {
        shopId: shopId!,
        saleId: sale.id,
        printerName: 'Default Counter Printer',
        jobType: 'REPRINT',
        rawPayload: Buffer.from(rawEscPos, 'binary').toString('base64'),
        status: 'QUEUED',
      },
    });

    // Record audit of reprint
    await prisma.auditLog.create({
      data: {
        shopId: shopId!,
        userId: req.user!.id,
        action: 'REPRINT',
        entityName: 'Sale',
        entityId: sale.id,
        newValue: JSON.stringify({ invoiceNumber: sale.invoiceNumber, reprintedBy: req.user!.name }),
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      message: `Reprint job created for ${sale.invoiceNumber}.`,
      data: {
        printJobId: printJob.id,
        receipt: {
          data: receiptData,
          plainText,
          rawEscPosBase64: Buffer.from(rawEscPos, 'binary').toString('base64'),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePrintJobStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, errorMessage } = req.body;

    const job = await prisma.printJob.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
        attempts: { increment: 1 },
      },
    });

    res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
