import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Bismi POS Database Seeding...');

  // 1. Create Shop
  const shop = await prisma.shop.create({
    data: {
      name: 'Bismi Fresh Chicken & Meats',
      branchName: 'Main Branch - Bazaar Road',
      address: 'No. 42, Market Main Road, Triplicane, Chennai - 600005',
      phone: '+91 98401 23456',
      gstin: '33AAAAA0000A1Z5',
      receiptHeader: 'BISMI FRESH CHICKEN & MEATS\n100% Halal & Hygienically Processed Daily',
      receiptFooter: 'Thank you for choosing Bismi Chicken!\nNo Antibiotics • Farm Fresh Daily • Quality Guaranteed',
      autoPrintReceipt: true,
      paperSize: '80mm',
      soundEnabled: true,
    },
  });

  console.log(`✅ Shop created: ${shop.name} (${shop.id})`);

  // 2. Hash Passwords & PINs
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminPinHash = await bcrypt.hash('1111', 10);

  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const managerPinHash = await bcrypt.hash('2222', 10);

  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);
  const cashierPinHash = await bcrypt.hash('1234', 10);

  const prepPasswordHash = await bcrypt.hash('prep123', 10);
  const prepPinHash = await bcrypt.hash('3333', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      shopId: shop.id,
      name: 'Prakash (Owner)',
      username: 'admin',
      passwordHash: adminPasswordHash,
      pinHash: adminPinHash,
      role: 'OWNER',
    },
  });

  const manager = await prisma.user.create({
    data: {
      shopId: shop.id,
      name: 'Syed (Manager)',
      username: 'manager',
      passwordHash: managerPasswordHash,
      pinHash: managerPinHash,
      role: 'MANAGER',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      shopId: shop.id,
      name: 'Arun (Billing Cashier)',
      username: 'cashier',
      passwordHash: cashierPasswordHash,
      pinHash: cashierPinHash,
      role: 'CASHIER',
    },
  });

  const prepWorker = await prisma.user.create({
    data: {
      shopId: shop.id,
      name: 'Muthu (Cutting Master)',
      username: 'prep',
      passwordHash: prepPasswordHash,
      pinHash: prepPinHash,
      role: 'PREPARATION_WORKER',
    },
  });

  console.log('✅ Users seeded: admin (PIN:1111), manager (PIN:2222), cashier (PIN:1234), prep (PIN:3333)');

  // 4. Create Products & Cutting Options
  const productsData = [
    {
      code: 'CHK-01',
      name: 'Broiler Chicken',
      nameLocal: 'பிராய்லர் கோழி',
      category: 'Fresh Meat',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 220.0,
      currentCostPrice: 175.0,
      warningWeightLimit: 5.0,
      criticalWeightLimit: 10.0,
      isQuickSelect: true,
      displayOrder: 1,
      options: [
        { name: 'Curry Cut', extraCharge: 10.0, isDefault: true },
        { name: 'Biryani Cut', extraCharge: 10.0, isDefault: false },
        { name: '65 Cut (Small)', extraCharge: 15.0, isDefault: false },
        { name: 'Skinless Whole', extraCharge: 10.0, isDefault: false },
        { name: 'With Skin Whole', extraCharge: 0.0, isDefault: false },
        { name: 'Boneless Cubes', extraCharge: 80.0, isDefault: false },
      ],
      stockKg: 150.0,
    },
    {
      code: 'CHK-02',
      name: 'Country Chicken (Nattu Kozhi)',
      nameLocal: 'நாட்டுக்கோழி',
      category: 'Fresh Meat',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 460.0,
      currentCostPrice: 380.0,
      warningWeightLimit: 3.5,
      criticalWeightLimit: 6.0,
      isQuickSelect: true,
      displayOrder: 2,
      options: [
        { name: 'Curry Cut', extraCharge: 15.0, isDefault: true },
        { name: 'Whole Dressed', extraCharge: 0.0, isDefault: false },
        { name: 'Chilly Cut', extraCharge: 15.0, isDefault: false },
      ],
      stockKg: 40.0,
    },
    {
      code: 'OFF-01',
      name: 'Fresh Chicken Liver',
      nameLocal: 'கோழி ஈரல்',
      category: 'Offal',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 340.0,
      currentCostPrice: 250.0,
      warningWeightLimit: 2.0,
      criticalWeightLimit: 4.0,
      isQuickSelect: true,
      displayOrder: 3,
      options: [
        { name: 'Standard Pieces', extraCharge: 0.0, isDefault: true },
        { name: 'Cleaned & Washed', extraCharge: 10.0, isDefault: false },
      ],
      stockKg: 25.0,
    },
    {
      code: 'OFF-02',
      name: 'Chicken Gizzard',
      nameLocal: 'கோழி கல் ஈரல்',
      category: 'Offal',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 280.0,
      currentCostPrice: 200.0,
      warningWeightLimit: 2.0,
      criticalWeightLimit: 4.0,
      isQuickSelect: true,
      displayOrder: 4,
      options: [
        { name: 'Cleaned', extraCharge: 0.0, isDefault: true },
      ],
      stockKg: 20.0,
    },
    {
      code: 'CUT-01',
      name: 'Chicken Breast Boneless',
      nameLocal: 'எலும்பில்லா மார்புக்கறி',
      category: 'Prime Cuts',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 360.0,
      currentCostPrice: 280.0,
      warningWeightLimit: 3.0,
      criticalWeightLimit: 6.0,
      isQuickSelect: true,
      displayOrder: 5,
      options: [
        { name: 'Steak Fillets', extraCharge: 0.0, isDefault: true },
        { name: 'Curry Cubes', extraCharge: 0.0, isDefault: false },
        { name: 'Mince (Keema)', extraCharge: 20.0, isDefault: false },
      ],
      stockKg: 30.0,
    },
    {
      code: 'CUT-02',
      name: 'Chicken Drumsticks (Leg)',
      nameLocal: 'கோழி லெக் பீஸ்',
      category: 'Prime Cuts',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 300.0,
      currentCostPrice: 230.0,
      warningWeightLimit: 4.0,
      criticalWeightLimit: 8.0,
      isQuickSelect: true,
      displayOrder: 6,
      options: [
        { name: 'Standard Cut', extraCharge: 0.0, isDefault: true },
        { name: 'Slit for Tandoori', extraCharge: 10.0, isDefault: false },
      ],
      stockKg: 35.0,
    },
    {
      code: 'CUT-03',
      name: 'Chicken Lollipop Cuts',
      nameLocal: 'லாலிபாப் துண்டுகள்',
      category: 'Prime Cuts',
      pricingType: 'WEIGHT_BASED',
      unit: 'KG',
      currentSellingPrice: 320.0,
      currentCostPrice: 240.0,
      warningWeightLimit: 3.0,
      criticalWeightLimit: 6.0,
      isQuickSelect: true,
      displayOrder: 7,
      options: [
        { name: 'Lollipop Cut (Wings)', extraCharge: 0.0, isDefault: true },
      ],
      stockKg: 20.0,
    },
    {
      code: 'EGG-01',
      name: 'Farm Fresh White Eggs',
      nameLocal: 'பண்ணை முட்டை',
      category: 'Eggs',
      pricingType: 'QUANTITY_BASED',
      unit: 'PIECE',
      currentSellingPrice: 7.0,
      currentCostPrice: 5.5,
      warningWeightLimit: 60.0,
      criticalWeightLimit: 120.0,
      isQuickSelect: true,
      displayOrder: 8,
      options: [],
      stockUnits: 300.0,
    },
    {
      code: 'EGG-02',
      name: 'Country Eggs (Nattu Muttai)',
      nameLocal: 'நாட்டு முட்டை',
      category: 'Eggs',
      pricingType: 'QUANTITY_BASED',
      unit: 'PIECE',
      currentSellingPrice: 14.0,
      currentCostPrice: 10.5,
      warningWeightLimit: 30.0,
      criticalWeightLimit: 60.0,
      isQuickSelect: true,
      displayOrder: 9,
      options: [],
      stockUnits: 120.0,
    },
    {
      code: 'MAS-01',
      name: 'Bismi Signature Chicken Masala (100g)',
      nameLocal: 'பிஸ்மி சிக்கன் மசாலா',
      category: 'Masala',
      pricingType: 'QUANTITY_BASED',
      unit: 'PACK',
      currentSellingPrice: 40.0,
      currentCostPrice: 28.0,
      warningWeightLimit: 10.0,
      criticalWeightLimit: 30.0,
      isQuickSelect: false,
      displayOrder: 10,
      options: [],
      stockUnits: 50.0,
    },
    {
      code: 'MAS-02',
      name: 'Bismi Chicken 65 Mix (100g)',
      nameLocal: 'சிக்கன் 65 மிக்ஸ்',
      category: 'Masala',
      pricingType: 'QUANTITY_BASED',
      unit: 'PACK',
      currentSellingPrice: 35.0,
      currentCostPrice: 24.0,
      warningWeightLimit: 10.0,
      criticalWeightLimit: 30.0,
      isQuickSelect: false,
      displayOrder: 11,
      options: [],
      stockUnits: 50.0,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        code: item.code,
        name: item.name,
        nameLocal: item.nameLocal,
        category: item.category,
        pricingType: item.pricingType,
        unit: item.unit,
        currentSellingPrice: item.currentSellingPrice,
        currentCostPrice: item.currentCostPrice,
        warningWeightLimit: item.warningWeightLimit,
        criticalWeightLimit: item.criticalWeightLimit,
        isQuickSelect: item.isQuickSelect,
        displayOrder: item.displayOrder,
      },
    });

    // Record initial price history
    await prisma.productPrice.create({
      data: {
        productId: product.id,
        sellingPrice: item.currentSellingPrice,
        costPrice: item.currentCostPrice,
        createdById: admin.id,
      },
    });

    // Create Options
    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        await prisma.productOption.create({
          data: {
            productId: product.id,
            name: opt.name,
            extraCharge: opt.extraCharge,
            isDefault: opt.isDefault,
          },
        });
      }
    }

    // Create Inventory Stock Record
    await prisma.inventoryItem.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        currentStockKg: item.stockKg || 0.0,
        currentStockUnits: item.stockUnits || 0.0,
        lowStockThreshold: item.pricingType === 'WEIGHT_BASED' ? 10.0 : 20.0,
      },
    });
  }

  console.log(`✅ Seeded ${productsData.length} products with options and initial stock.`);

  // 5. Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      shopId: shop.id,
      name: 'Rahman Bhai (Hotel Taj)',
      phone: '9840987654',
      address: '22, Mosque Street, Triplicane',
      creditBalance: 1250.0,
      creditLimit: 10000.0,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      shopId: shop.id,
      name: 'Karthik Raja',
      phone: '9790123456',
      address: 'Flat 3B, Sunshine Apts, Royapettah',
      creditBalance: 0.0,
      creditLimit: 3000.0,
    },
  });

  console.log('✅ Seeded 2 sample customers.');

  // 6. Create Initial Active Cash Session
  await prisma.cashSession.create({
    data: {
      shopId: shop.id,
      userId: cashier.id,
      openingCash: 2000.0,
      expectedCash: 2000.0,
      status: 'OPEN',
      notes: 'Morning shift opening register cash count',
    },
  });

  // 7. Seed Printer Config
  await prisma.printerConfig.create({
    data: {
      shopId: shop.id,
      name: 'Main Counter Thermal Printer (80mm)',
      adapterType: 'QZ_TRAY',
      connectionStr: 'EPSON TM-T82 Receipt',
      paperWidth: '80mm',
      autoCut: true,
      openDrawer: true,
      isDefault: true,
    },
  });

  console.log('✅ Seeded active cash session & printer hardware config.');
  console.log('🚀 Bismi POS Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
