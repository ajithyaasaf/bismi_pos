import { offlineDb, OfflineSaleOutbox } from './offlineDb.js';
import { apiClient } from './api.js';

class BackgroundSyncService {
  private isSyncing: boolean = false;
  private syncListeners: ((pendingCount: number) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processOutbox();
      });
      // Heartbeat interval
      setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.processOutbox();
        }
      }, 15000);
    }
  }

  public subscribe(callback: (pendingCount: number) => void) {
    this.syncListeners.push(callback);
    this.notifyPendingCount();
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  private async notifyPendingCount() {
    const count = await offlineDb.salesOutbox.where('syncStatus').equals('PENDING').count();
    this.syncListeners.forEach((cb) => cb(count));
  }

  public async queueOfflineSale(saleData: Omit<OfflineSaleOutbox, 'id' | 'syncStatus'>): Promise<number> {
    const id = await offlineDb.salesOutbox.add({
      ...saleData,
      syncStatus: 'PENDING',
    });
    this.notifyPendingCount();
    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.processOutbox();
    }
    return id as number;
  }

  public async processOutbox(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const pendingSales = await offlineDb.salesOutbox
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      for (const sale of pendingSales) {
        try {
          await offlineDb.salesOutbox.update(sale.id!, { syncStatus: 'SYNCING' });

          const payload = {
            localSaleId: sale.localSaleId,
            customerId: sale.customerId,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            items: sale.items,
            payments: sale.payments,
            discountAmount: sale.discountAmount,
          };

          const response = await apiClient.post('/sales/checkout', payload);

          if (response.data?.success) {
            await offlineDb.salesOutbox.update(sale.id!, {
              syncStatus: 'SYNCED',
            });
          }
        } catch (err: any) {
          console.warn(`Failed to sync offline sale ${sale.localSaleId}:`, err.message);
          await offlineDb.salesOutbox.update(sale.id!, {
            syncStatus: 'PENDING',
            errorMessage: err.message,
          });
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyPendingCount();
    }
  }
}

export const syncService = new BackgroundSyncService();
export default syncService;
