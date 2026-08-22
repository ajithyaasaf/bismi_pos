import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import shopRoutes from './modules/shops/shop.routes.js';
import userRoutes from './modules/users/user.routes.js';
import productRoutes from './modules/products/product.routes.js';
import pricingRoutes from './modules/pricing/pricing.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import preparationRoutes from './modules/preparation/preparation.routes.js';
import saleRoutes from './modules/sales/sale.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import purchaseRoutes from './modules/purchases/purchase.routes.js';
import expenseRoutes from './modules/expenses/expense.routes.js';
import cashRoutes from './modules/cash/cash.routes.js';
import printingRoutes from './modules/printing/printing.routes.js';
import hardwareRoutes from './modules/hardware/hardware.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Global Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'HEALTHY',
      service: 'Bismi Chicken POS Modular Backend',
      brand: '#FB2C36',
      timestamp: new Date().toISOString(),
    });
  });

  // API Version 1 Routes
  const apiV1 = express.Router();
  apiV1.use('/auth', authRoutes);
  apiV1.use('/shops', shopRoutes);
  apiV1.use('/users', userRoutes);
  apiV1.use('/products', productRoutes);
  apiV1.use('/pricing', pricingRoutes);
  apiV1.use('/orders', orderRoutes);
  apiV1.use('/preparation', preparationRoutes);
  apiV1.use('/sales', saleRoutes);
  apiV1.use('/customers', customerRoutes);
  apiV1.use('/inventory', inventoryRoutes);
  apiV1.use('/purchases', purchaseRoutes);
  apiV1.use('/expenses', expenseRoutes);
  apiV1.use('/cash', cashRoutes);
  apiV1.use('/printing', printingRoutes);
  apiV1.use('/hardware', hardwareRoutes);
  apiV1.use('/reports', reportRoutes);
  apiV1.use('/audit', auditRoutes);

  app.use('/api/v1', apiV1);

  // Serve Frontend Single-Page App (SPA) when built
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      // Don't intercept API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
