export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'PREPARATION_WORKER';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  isActive?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  branchName?: string;
  address: string;
  phone: string;
  gstin?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  autoPrintReceipt: boolean;
  paperSize: '58mm' | '80mm';
  soundEnabled: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  extraCharge: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  category: string;
  pricingType: 'WEIGHT_BASED' | 'QUANTITY_BASED';
  unit: 'KG' | 'GRAM' | 'PIECE' | 'PACK';
  currentSellingPrice: number;
  currentCostPrice: number;
  warningWeightLimit: number;
  criticalWeightLimit: number;
  isQuickSelect: boolean;
  displayOrder: number;
  isActive: boolean;
  options: ProductOption[];
  inventoryItem?: {
    currentStockKg: number;
    currentStockUnits: number;
    lowStockThreshold: number;
  };
}

export interface CartItem {
  id: string; // Unique cart line ID
  productId: string;
  code: string;
  name: string;
  unit: string;
  pricingType: 'WEIGHT_BASED' | 'QUANTITY_BASED';
  unitPrice: number;
  costPrice: number;
  requestedWeight?: number | null; // e.g. 1.500 KG
  finalWeight?: number | null; // e.g. 1.320 KG (if weighed post-prep)
  quantity: number; // e.g. 1 or 6 eggs
  optionId?: string | null;
  cuttingName?: string | null;
  cuttingCharge: number;
  totalPrice: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  optionId?: string | null;
  productName: string;
  unitPrice: number;
  costPrice: number;
  requestedWeight?: number | null;
  finalWeight?: number | null;
  quantity: number;
  cuttingCharge: number;
  itemTotal: number;
  isPrepared: boolean;
  option?: ProductOption | null;
}

export interface Order {
  id: string;
  dailyOrderNumber: number;
  status: 'DRAFT' | 'HELD' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  customerId?: string | null;
  customerName?: string | null;
  totalEstimatedAmount: number;
  totalFinalAmount: number;
  notes?: string | null;
  createdAt: string;
  readyAt?: string | null;
  items: OrderItem[];
}

export interface PaymentAllocation {
  method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT';
  amount: number;
  cashReceived?: number;
  cashChange?: number;
  transactionRef?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  requestedWeight?: number | null;
  finalWeight?: number | null;
  quantity: number;
  cuttingName?: string | null;
  cuttingCharge: number;
  totalPrice: number;
  grossProfit: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  localSaleId?: string;
  cashierId: string;
  customerId?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  roundingAmount: number;
  finalAmount: number;
  grossProfit: number;
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  items: SaleItem[];
  payments: PaymentAllocation[];
  customer?: { name: string; phone: string } | null;
  cashier?: { name: string };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  creditBalance: number;
  creditLimit: number;
  isActive: boolean;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  expectedCash: number;
  actualCash?: number | null;
  difference?: number | null;
  totalCashSales: number;
  totalCashExpenses: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
  user?: { name: string };
}

export interface PrinterConfig {
  id: string;
  name: string;
  adapterType: 'QZ_TRAY' | 'NETWORK_ESC_POS' | 'WEB_USB' | 'BROWSER_PRINT';
  connectionStr: string;
  paperWidth: '58mm' | '80mm';
  autoCut: boolean;
  openDrawer: boolean;
  isDefault: boolean;
}

export interface VoiceParsedItem {
  product: Product;
  weight?: number;
  quantity?: number;
  option?: ProductOption;
  confidence: number;
  isAnomaly?: boolean;
  anomalyReason?: string;
}
