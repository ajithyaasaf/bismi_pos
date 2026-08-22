import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateShop() {
  try {
    const shops = await prisma.shop.findMany();
    if (shops.length > 0) {
      const updated = await prisma.shop.update({
        where: { id: shops[0].id },
        data: {
          name: 'Bismi Broilers',
          branchName: 'முதுகுளத்தூர் (Mudukulathur)',
          address: 'ஹயர்நிஷா மருத்துவமனை அருகில், (SBI ATM) எதிரில், முதுகுளத்தூர்',
          phone: '+91 86810 87082',
          receiptHeader: 'பிஸ்மி பிராய்லர்ஸ் (Bismi Broilers)\nஹயர்நிஷா மருத்துவமனை அருகில், (SBI ATM) எதிரில், முதுகுளத்தூர்',
          receiptFooter: 'நன்றி! மீண்டும் வருக!\nThank you for choosing Bismi Broilers!\nFresh & Hygienic Daily',
        },
      });
      console.log('✅ Shop updated successfully in Neon PostgreSQL:', updated);
    } else {
      console.log('No shops found.');
    }
  } catch (err) {
    console.error('Error updating shop:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateShop();
