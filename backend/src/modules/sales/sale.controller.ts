import { Response } from 'express';
import { prisma } from '../../database/index.js';
import { AuthenticatedRequest, verifyManagerOrOwnerPin } from '../../middleware/auth.js';
import { generateInvoiceNumber } from '../../utils/invoice.js';
import { EscPosBuilder, ReceiptData } from '../../utils/escpos.js';

export const checkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const cashierId = req.user?.id;
    const {
      orderId,
      customerId,
      customerName,
      customerPhone,
      items,
      payments,
      discountAmount = 0,
      notes,
      localSaleId,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Sale must contain at least one item.' });
      return;
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ success: false, message: 'Payment breakdown is required.' });
      return;
    }

    // Idempotency check for offline sync
    if (localSaleId) {
      const existingSale = await prisma.sale.findFirst({
        where: { shopId, localSaleId },
        include: { items: true, payments: true, customer: true },
      });
      if (existingSale) {
        res.json({
          success: true,
          message: 'Sale already synced previously.',
          data: existingSale,
          isDuplicate: true,
        });
        return;
      }
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      res.status(404).json({ success: false, message: 'Shop not found.' });
      return;
    }

    // 1. Calculate Totals & Snapshot Items
    let subtotal = 0;
    let totalCost = 0;

    const snapshotItems = items.map((item: any) => {
      const unit = item.unit || 'KG';
      const unitPrice = parseFloat(item.unitPrice);
      const costPrice = parseFloat(item.costPrice || 0);
      const cuttingCharge = parseFloat(item.cuttingCharge || 0);
      
      const requestedWeight = item.requestedWeight !== undefined && item.requestedWeight !== null ? parseFloat(item.requestedWeight) : null;
      const finalWeight = item.finalWeight !== undefined && item.finalWeight !== null ? parseFloat(item.finalWeight) : requestedWeight;
      const quantity = item.quantity !== undefined ? parseFloat(item.quantity) : 1;

      const billedUnitsOrWeight = finalWeight !== null ? finalWeight : quantity;
      const itemBaseTotal = billedUnitsOrWeight * unitPrice;
      const itemTotal = itemBaseTotal + cuttingCharge;
      const itemCostTotal = billedUnitsOrWeight * costPrice;
      const grossProfit = itemTotal - itemCostTotal;

      subtotal += itemTotal;
      totalCost += itemCostTotal;

      return {
        productId: item.productId,
        productName: item.productName,
        unit,
        unitPrice,
        costPrice,
        requestedWeight,
        finalWeight,
        quantity,
        cuttingName: item.cuttingName || null,
        cuttingCharge,
        totalPrice: itemTotal,
        grossProfit,
      };
    });

    const parsedDiscount = parseFloat(discountAmount);
    const unroundedTotal = Math.max(0, subtotal - parsedDiscount);
    const roundedFinalTotal = Math.round(unroundedTotal);
    const roundingAmount = roundedFinalTotal - unroundedTotal;
    const finalGrossProfit = roundedFinalTotal - totalCost;

    // 2. Handle Customer creation / credit balance
    let resolvedCustomerId = customerId || null;
    let resolvedCustomerName = customerName || 'Walk-in Customer';

    if (customerPhone && !resolvedCustomerId) {
      let cust = await prisma.customer.findUnique({ where: { phone: customerPhone } });
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            shopId: shopId!,
            name: customerName || 'Valued Customer',
            phone: customerPhone,
          },
        });
      }
      resolvedCustomerId = cust.id;
      resolvedCustomerName = cust.name;
    }

    const invoiceNumber = await generateInvoiceNumber(shopId!);

    // 3. Database Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Sale Record
      const sale = await tx.sale.create({
        data: {
          shopId: shopId!,
          orderId: orderId || null,
          invoiceNumber,
          localSaleId: localSaleId || null,
          cashierId: cashierId!,
          customerId: resolvedCustomerId,
          subtotal,
          discountAmount: parsedDiscount,
          taxAmount: 0.0,
          roundingAmount,
          finalAmount: roundedFinalTotal,
          costAmount: totalCost,
          grossProfit: finalGrossProfit,
          status: 'COMPLETED',
          isSynced: true,
          items: {
            create: snapshotItems,
          },
        },
        include: { items: true },
      });

      // Record Payments
      let totalCashReceived = 0;
      let totalCashSales = 0;

      for (const pay of payments) {
        const payAmount = parseFloat(pay.amount);
        const cashRec = pay.cashReceived !== undefined ? parseFloat(pay.cashReceived) : null;
        const cashChg = pay.cashChange !== undefined ? parseFloat(pay.cashChange) : null;

        await tx.payment.create({
          data: {
            saleId: sale.id,
            method: pay.method,
            amount: payAmount,
            cashReceived: cashRec,
            cashChange: cashChg,
            transactionRef: pay.transactionRef || null,
          },
        });

        if (pay.method === 'CASH') {
          totalCashSales += payAmount;
          if (cashRec) totalCashReceived += cashRec;
        }

        // If paid via CREDIT (Udhaar), update customer balance
        if (pay.method === 'CREDIT' && resolvedCustomerId) {
          const cust = await tx.customer.findUnique({ where: { id: resolvedCustomerId } });
          const newBal = (cust?.creditBalance || 0) + payAmount;
          await tx.customer.update({
            where: { id: resolvedCustomerId },
            data: { creditBalance: newBal },
          });

          await tx.creditTransaction.create({
            data: {
              customerId: resolvedCustomerId,
              saleId: sale.id,
              type: 'CREDIT_SALE',
              amount: payAmount,
              balanceAfter: newBal,
              notes: `Bill #${invoiceNumber}`,
              createdById: cashierId!,
            },
          });
        }
      }

      // Deduct Inventory Stock
      for (const item of snapshotItems) {
        const deductQty = item.finalWeight !== null ? item.finalWeight : item.quantity;
        
        await tx.inventoryItem.upsert({
          where: { productId: item.productId },
          update: {
            currentStockKg: { decrement: item.finalWeight !== null ? deductQty : 0 },
            currentStockUnits: { decrement: item.finalWeight === null ? deductQty : 0 },
          },
          create: {
            shopId: shopId!,
            productId: item.productId,
            currentStockKg: item.finalWeight !== null ? -deductQty : 0,
            currentStockUnits: item.finalWeight === null ? -deductQty : 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            shopId: shopId!,
            productId: item.productId,
            type: 'SALE_DEDUCTION',
            quantityKg: deductQty,
            unitCost: item.costPrice,
            reason: `Sale ${invoiceNumber}`,
            createdById: cashierId!,
          },
        });
      }

      // If tied to an Order, mark order as COMPLETED
      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      // Update active Cash Session if cash collected
      if (totalCashSales > 0) {
        const activeSession = await tx.cashSession.findFirst({
          where: { shopId, status: 'OPEN' },
        });
        if (activeSession) {
          await tx.cashSession.update({
            where: { id: activeSession.id },
            data: {
              totalCashSales: { increment: totalCashSales },
              expectedCash: { increment: totalCashSales },
            },
          });
        }
      }

      return sale;
    });

    // 4. Generate ESC/POS Thermal Receipt Payload & Queue Print Job
    const receiptData: ReceiptData = {
      shopName: shop.name,
      branchName: shop.branchName || undefined,
      address: shop.address,
      phone: shop.phone,
      gstin: shop.gstin || undefined,
      invoiceNumber: result.invoiceNumber,
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      cashierName: req.user!.name,
      customerName: resolvedCustomerName,
      items: snapshotItems.map((si) => ({
        name: si.productName,
        weightOrQty: si.finalWeight !== null ? `${si.finalWeight.toFixed(3)} KG` : `${si.quantity} Units`,
        rate: si.unitPrice,
        cuttingName: si.cuttingName || undefined,
        cuttingCharge: si.cuttingCharge,
        total: si.totalPrice,
      })),
      subtotal,
      discount: parsedDiscount,
      tax: 0,
      rounding: roundingAmount,
      grandTotal: roundedFinalTotal,
      paymentMethod: payments.map((p: any) => p.method).join(' + '),
      cashReceived: payments.find((p: any) => p.method === 'CASH')?.cashReceived,
      cashChange: payments.find((p: any) => p.method === 'CASH')?.cashChange,
      receiptFooter: shop.receiptFooter || undefined,
      paperWidth: (shop.paperSize as any) || '80mm',
    };

    const builder = new EscPosBuilder(receiptData.paperWidth);
    const { rawEscPos, plainText } = builder.generateReceipt(receiptData, { kickDrawer: true, cut: true });

    // Queue Print Job (Decoupled from sale success)
    const printJob = await prisma.printJob.create({
      data: {
        shopId: shopId!,
        saleId: result.id,
        printerName: 'Default Counter Printer',
        jobType: 'RECEIPT',
        rawPayload: Buffer.from(rawEscPos, 'binary').toString('base64'),
        status: 'QUEUED',
      },
    });

    res.status(201).json({
      success: true,
      message: `Sale completed: ${result.invoiceNumber}`,
      data: {
        sale: result,
        invoiceNumber: result.invoiceNumber,
        grandTotal: roundedFinalTotal,
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

export const getSalesHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const { startDate, endDate, search, limit = '50', page = '1' } = req.query;

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const whereClause: any = { shopId };

    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search as string } },
        { customer: { name: { contains: search as string } } },
        { customer: { phone: { contains: search as string } } },
      ];
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate as string);
      if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
    }

    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        include: {
          items: true,
          payments: true,
          cashier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.sale.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total: totalCount,
        page: parseInt(page as string, 10),
        limit: take,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSaleById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        cashier: { select: { id: true, name: true } },
        customer: true,
        printJobs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found.' });
      return;
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { pin, reason } = req.body;
    const shopId = req.user?.shopId;

    if (!pin) {
      res.status(403).json({ success: false, message: 'Manager PIN is required to cancel a completed sale.' });
      return;
    }

    const pinResult = await verifyManagerOrOwnerPin(shopId!, pin);
    if (!pinResult.valid) {
      res.status(403).json({ success: false, message: pinResult.error || 'Invalid Manager authorization PIN.' });
      return;
    }

    const sale: any = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!sale || sale.shopId !== shopId) {
      res.status(404).json({ success: false, message: 'Sale not found.' });
      return;
    }

    if (sale.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Sale is already cancelled.' });
      return;
    }

    // Process reversal in atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Sale Status
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. Reverse Inventory
      for (const item of sale.items) {
        const qty = item.finalWeight !== null ? item.finalWeight : item.quantity;
        await tx.inventoryItem.update({
          where: { productId: item.productId },
          data: {
            currentStockKg: { increment: item.finalWeight !== null ? qty : 0 },
            currentStockUnits: { increment: item.finalWeight === null ? qty : 0 },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            shopId: shopId!,
            productId: item.productId,
            type: 'MANUAL_ADJUSTMENT',
            quantityKg: qty,
            unitCost: item.costPrice,
            reason: `Restock from cancelled bill ${sale.invoiceNumber}: ${reason || 'Customer cancellation'}`,
            createdById: pinResult.user!.id,
          },
        });
      }

      // 3. Log Audit
      await tx.auditLog.create({
        data: {
          shopId: shopId!,
          userId: pinResult.user!.id,
          action: 'SALE_CANCEL',
          entityName: 'Sale',
          entityId: sale.id,
          oldValue: JSON.stringify({ invoiceNumber: sale.invoiceNumber, finalAmount: sale.finalAmount }),
          newValue: JSON.stringify({ status: 'CANCELLED', reason, cancelledBy: pinResult.user!.name }),
          ipAddress: req.ip,
        },
      });
    });

    res.json({
      success: true,
      message: `Sale ${sale.invoiceNumber} has been successfully cancelled and stock restored.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncOfflineSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shopId = req.user?.shopId;
    const cashierId = req.user?.id;
    const { offlineSales } = req.body;

    if (!Array.isArray(offlineSales) || offlineSales.length === 0) {
      res.status(400).json({ success: false, message: 'No offline sales provided.' });
      return;
    }

    let syncedCount = 0;
    let duplicateCount = 0;
    const results: any[] = [];

    for (const off of offlineSales) {
      // 1. Check idempotency by localSaleId
      if (off.localSaleId) {
        const existing = await prisma.sale.findFirst({
          where: { shopId, localSaleId: off.localSaleId },
        });

        if (existing) {
          duplicateCount++;
          results.push({ localSaleId: off.localSaleId, invoiceNumber: existing.invoiceNumber, status: 'DUPLICATE' });
          continue;
        }
      }

      // 2. Generate server invoice number
      const invoiceNumber = await generateInvoiceNumber(shopId!);

      // 3. Calculate total cost amount
      const costAmount = off.items.reduce((sum: number, i: any) => {
        const qty = i.finalWeight !== null && i.finalWeight !== undefined ? i.finalWeight : i.quantity || 1;
        return sum + (qty * (i.costPrice || 0));
      }, 0);

      // 4. Create Sale & deduct inventory atomically
      await prisma.$transaction(async (tx) => {
        const newSale = await tx.sale.create({
          data: {
            shopId: shopId!,
            cashierId: cashierId!,
            customerId: off.customerId || null,
            invoiceNumber,
            localSaleId: off.localSaleId || null,
            subtotal: off.subtotal,
            costAmount,
            grossProfit: off.finalAmount - costAmount,
            discountAmount: off.discountAmount || 0,
            roundingAmount: off.roundingAmount || 0,
            finalAmount: off.finalAmount,
            taxAmount: 0,
            status: 'COMPLETED',
            isSynced: true,
            createdAt: new Date(off.createdAt || Date.now()),
            items: {
              create: off.items.map((item: any) => {
                const itemQty = item.finalWeight !== null && item.finalWeight !== undefined ? item.finalWeight : item.quantity || 1;
                const itemCost = item.costPrice || 0;
                const itemGross = item.totalPrice - (itemCost * itemQty);

                return {
                  productId: item.productId,
                  productName: item.productName || item.name || 'Chicken Shop Item',
                  unit: item.unit || 'KG',
                  unitPrice: item.unitPrice,
                  costPrice: itemCost,
                  requestedWeight: item.requestedWeight || null,
                  finalWeight: item.finalWeight || null,
                  quantity: item.quantity || 1,
                  cuttingName: item.cuttingName || null,
                  cuttingCharge: item.cuttingCharge || 0,
                  totalPrice: item.totalPrice,
                  grossProfit: itemGross,
                };
              }),
            },
            payments: {
              create: off.payments.map((p: any) => ({
                method: p.method,
                amount: p.amount,
                cashReceived: p.cashReceived || null,
                cashChange: p.cashChange || null,
                transactionRef: p.transactionRef || null,
              })),
            },
          },
        });

        // Deduct inventory
        for (const item of off.items) {
          const qty = item.finalWeight !== null && item.finalWeight !== undefined ? item.finalWeight : item.quantity || 1;
          await tx.inventoryItem.upsert({
            where: { productId: item.productId },
            update: {
              currentStockKg: item.unit === 'KG' ? { decrement: qty } : undefined,
              currentStockUnits: item.unit !== 'KG' ? { decrement: qty } : undefined,
            },
            create: {
              shopId: shopId!,
              productId: item.productId,
              currentStockKg: item.unit === 'KG' ? -qty : 0,
              currentStockUnits: item.unit !== 'KG' ? -qty : 0,
            },
          });
        }

        syncedCount++;
        results.push({ localSaleId: off.localSaleId, invoiceNumber, status: 'SYNCED' });
      });
    }

    res.json({
      success: true,
      message: `Synchronized ${syncedCount} offline sale(s).`,
      data: {
        syncedCount,
        duplicateCount,
        results,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

