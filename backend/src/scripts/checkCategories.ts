import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCategories() {
  const prods = await prisma.product.findMany({
    select: { id: true, name: true, category: true },
    orderBy: { displayOrder: 'asc' },
  });
  console.log('Current DB Products:');
  console.table(prods);
  await prisma.$disconnect();
}

checkCategories();
