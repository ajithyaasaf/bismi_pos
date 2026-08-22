import { prisma } from '../database/index.js';

export async function generateInvoiceNumber(shopId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `INV-${year}${month}${day}`;

  // Start of today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Count sales for this shop today
  const countToday = await prisma.sale.count({
    where: {
      shopId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(4, '0');
  return `${datePrefix}-${sequence}`;
}

export async function generateDailyOrderNumber(shopId: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const countToday = await prisma.order.count({
    where: {
      shopId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  return 1001 + countToday;
}
