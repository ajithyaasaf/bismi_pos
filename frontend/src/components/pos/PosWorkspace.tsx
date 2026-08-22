import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, ArrowRight, X } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { usePosStore } from '../../store/posStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { ProductGrid } from './ProductGrid.js';
import { CartList } from './CartList.js';
import { WeightEntryModal } from './WeightEntryModal.js';
import { PaymentModal } from './PaymentModal.js';
import { PaymentSuccessModal } from './PaymentSuccessModal.js';
import { HeldOrdersDrawer } from './HeldOrdersDrawer.js';
import { ReadyOrdersDrawer } from './ReadyOrdersDrawer.js';
import { VoiceDrawer } from './VoiceDrawer.js';
import { syncService } from '../../services/syncService.js';
import sound from '../../services/soundService.js';

export const PosWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { cart, activeOrderId, selectedCustomer, getTotals, clearCart, setHeldOrders, setReadyOrders } = usePosStore();
  const {
    setPaymentModalOpen,
    setSuccessModalOpen,
    setHeldDrawerOpen,
    setReadyDrawerOpen,
    setVoiceDrawerOpen,
    showToast,
  } = useUiStore();

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Fetch active products
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return res.data?.data || [];
    },
  });

  // Fetch held orders
  const { data: heldData } = useQuery({
    queryKey: ['orders-held'],
    queryFn: async () => {
      const res = await apiClient.get('/orders/held');
      return res.data?.data || [];
    },
    refetchInterval: 8000,
  });

  // Fetch ready orders from preparation queue
  const { data: readyData } = useQuery({
    queryKey: ['orders-ready'],
    queryFn: async () => {
      const res = await apiClient.get('/preparation/ready');
      return res.data?.data || [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (heldData) setHeldOrders(heldData);
  }, [heldData, setHeldOrders]);

  useEffect(() => {
    if (readyData) {
      setReadyOrders(readyData);
    }
  }, [readyData, setReadyOrders]);

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: async (payments: any[]) => {
      const { discount, netTotal } = getTotals();
      const localSaleId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const payload = {
        orderId: activeOrderId || undefined,
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.name,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          requestedWeight: item.requestedWeight,
          finalWeight: item.finalWeight,
          quantity: item.quantity,
          cuttingName: item.cuttingName,
          cuttingCharge: item.cuttingCharge || 0,
          totalPrice: item.totalPrice,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          cashReceived: p.cashReceived,
          cashChange: p.cashChange,
          transactionRef: p.transactionRef,
        })),
        subtotal: getTotals().subtotal,
        discountAmount: discount,
        roundingAmount: getTotals().rounding,
        finalAmount: netTotal,
        localSaleId,
      };

      try {
        const res = await apiClient.post('/sales', payload);
        return res.data?.data;
      } catch (err: any) {
        if (!navigator.onLine || err.code === 'ERR_NETWORK') {
          await syncService.queueOfflineSale({
            localSaleId,
            invoiceTempNumber: `OFF-${Date.now().toString().slice(-4)}`,
            shopId: 'default-shop',
            cashierId: 'default-cashier',
            customerId: selectedCustomer?.id || null,
            customerName: selectedCustomer?.name || 'Walk-in Customer',
            customerPhone: selectedCustomer?.phone || null,
            items: cart,
            payments: payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              cashReceived: p.cashReceived,
              cashChange: p.cashChange,
              transactionRef: p.transactionRef,
            })),
            subtotal: getTotals().subtotal,
            discountAmount: discount,
            roundingAmount: getTotals().rounding,
            finalAmount: netTotal,
            createdAt: new Date().toISOString(),
          });
          return {
            invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
            finalAmount: netTotal,
            changeDue: payments[0]?.cashChange || 0,
            isOffline: true,
          };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      sound.playPaymentSuccess();
      queryClient.invalidateQueries({ queryKey: ['orders-held'] });
      queryClient.invalidateQueries({ queryKey: ['orders-ready'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      clearCart();
      setIsMobileCartOpen(false);
      setSuccessModalOpen(true, data);
    },
    onError: (err: any) => {
      sound.playWarning();
      showToast('danger', err.response?.data?.message || 'Checkout failed.');
    },
  });

  // Send to Preparation Station Mutation
  const sendToPrepMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone,
        notes: 'Express Cut Request',
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.name,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          requestedWeight: item.requestedWeight,
          quantity: item.quantity,
          cuttingName: item.cuttingName,
          cuttingCharge: item.cuttingCharge || 0,
          totalPrice: item.totalPrice,
        })),
      };

      const res = await apiClient.post('/orders', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      sound.playPaymentSuccess();
      queryClient.invalidateQueries({ queryKey: ['orders-held'] });
      clearCart();
      setIsMobileCartOpen(false);
      showToast('success', `Sent to Kitchen! Token #${data.dailySequence}`);
    },
    onError: (err: any) => {
      sound.playWarning();
      showToast('danger', err.response?.data?.message || 'Failed to send to kitchen.');
    },
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      if (e.key === 'F2') {
        e.preventDefault();
        sound.playTap();
        clearCart();
        showToast('info', 'New bill started');
      } else if (e.key === 'F3') {
        e.preventDefault();
        sound.playTap();
        setHeldDrawerOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        sound.playTap();
        setReadyDrawerOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          sound.playTap();
          setPaymentModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cart, clearCart, setHeldDrawerOpen, setReadyDrawerOpen, setPaymentModalOpen, showToast]);

  const { netTotal } = getTotals();
  const totalItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] overflow-hidden bg-surface-muted/30">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* A. DESKTOP WORKSPACE (100% UNTOUCHED FOR DESKTOP / PC)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 flex-row gap-4 p-4 h-full overflow-hidden">
        {/* Left 60%: Product Catalog & Category Grid */}
        <div className="flex-[3] h-full flex flex-col min-w-0 bg-surface rounded-2xl p-4 border border-border shadow-card">
          <ProductGrid
            products={productsData || []}
            isLoading={isProductsLoading}
          />
        </div>

        {/* Right 40%: Fast Cart, Billing Totals & Instant Pay */}
        <div className="flex-[2] h-full flex flex-col min-w-[360px] max-w-xl">
          <CartList
            onQuickCheckout={(payments) => checkoutMutation.mutate(payments)}
            onSendToPrep={() => sendToPrepMutation.mutate()}
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* B. MOBILE WORKSPACE (OPTIMIZED FOR SMARTPHONE VIEWPORTS)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-1 flex-col h-[calc(100vh-120px)] p-2 pb-16 overflow-hidden relative">
        {/* Full-Width Mobile Catalog */}
        <div className="flex-1 h-full flex flex-col min-w-0 bg-surface rounded-2xl p-3 border border-border shadow-card overflow-hidden">
          <ProductGrid
            products={productsData || []}
            isLoading={isProductsLoading}
          />
        </div>

        {/* Floating Sticky Mobile Cart Preview Bar (Fixed above bottom navbar) */}
        {cart.length > 0 && (
          <div className="fixed bottom-[72px] left-3 right-3 bg-brand-600 text-white rounded-2xl p-3 shadow-modal flex items-center justify-between z-30 animate-slideUp border border-brand-400/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                <ShoppingBag size={18} />
              </div>
              <div>
                <div className="text-xs font-black leading-none">
                  {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} • ₹{netTotal.toFixed(2)}
                </div>
                <span className="text-[10px] text-white/85 font-medium">
                  Tap to view bill & checkout
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                setIsMobileCartOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-brand-700 font-extrabold text-xs shadow-md active:scale-95 transition-all"
            >
              <span>View Cart</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* C. FULL-SCREEN MOBILE CART & CHECKOUT DRAWER                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink-primary/70 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-surface rounded-t-3xl border-t border-border h-[92vh] flex flex-col p-3 shadow-modal">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                  🛒
                </div>
                <span className="text-sm font-black text-ink-primary">Active Bill ({totalItemCount} items)</span>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <CartList
                onQuickCheckout={(payments) => {
                  checkoutMutation.mutate(payments);
                  setIsMobileCartOpen(false);
                }}
                onSendToPrep={() => {
                  sendToPrepMutation.mutate();
                  setIsMobileCartOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Drawers & Modals */}
      <WeightEntryModal />
      <PaymentModal
        onConfirmPayment={(payments) => checkoutMutation.mutate(payments)}
        isLoading={checkoutMutation.isPending}
      />
      <PaymentSuccessModal />
      <HeldOrdersDrawer />
      <ReadyOrdersDrawer />
      <VoiceDrawer products={productsData || []} />
    </div>
  );
};
