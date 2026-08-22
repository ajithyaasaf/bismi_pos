import Dexie, { Table } from 'dexie';
import { Product, Customer, CartItem, PaymentAllocation } from '../types/index.js';

export interface OfflineSaleOutbox {
  id?: number;
  localSaleId: string; // UUIDv7 / unique client identifier
  invoiceTempNumber: string; // e.g. "OFF-1001"
  shopId: string;
  cashierId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: CartItem[];
  payments: PaymentAllocation[];
  subtotal: number;
  discountAmount: number;
  roundingAmount: number;
  finalAmount: number;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export interface LocalHeldBill {
  id: string; // Local UUID
  orderNumber: number;
  customerName: string;
  items: CartItem[];
  createdAt: string;
  notes?: string;
}

export class BismiOfflineDatabase extends Dexie {
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  heldBills!: Table<LocalHeldBill, string>;
  salesOutbox!: Table<OfflineSaleOutbox, number>;

  constructor() {
    super('BismiPosOfflineDb');
    this.version(1).stores({
      products: 'id, code, name, category, isQuickSelect',
      customers: 'id, phone, name',
      heldBills: 'id, orderNumber, createdAt',
      salesOutbox: '++id, localSaleId, syncStatus, createdAt',
    });
  }
}

export const offlineDb = new BismiOfflineDatabase();
export default offlineDb;
