import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
          cuttingCharge: item.cuttingCharge,
          totalPrice: item.totalPrice,
        })),
        payments,
        discountAmount: discount,
        localSaleId,
      };

      // If offline, queue in IndexedDB
      if (!navigator.onLine) {
        await syncService.queueOfflineSale({
          localSaleId,
          invoiceTempNumber: `OFF-${Date.now().toString().slice(-4)}`,
          shopId: '',
          cashierId: '',
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          items: cart,
          payments,
          subtotal: getTotals().subtotal,
          discountAmount: discount,
          roundingAmount: getTotals().rounding,
          finalAmount: netTotal,
          createdAt: new Date().toISOString(),
        });

        return {
          success: true,
          data: {
            invoiceNumber: `OFF-${Date.now().toString().slice(-4)} (Offline)`,
            grandTotal: netTotal,
          },
        };
      }

      const res = await apiClient.post('/sales/checkout', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders-held'] });
      queryClient.invalidateQueries({ queryKey: ['orders-ready'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setPaymentModalOpen(false);
      setSuccessModalOpen(true, data.data);
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Checkout failed.');
    },
  });

  // Send to Prep Queue Mutation
  const sendToPrepMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        status: 'PREPARING',
        items: cart.map((item) => ({
          productId: item.productId,
          optionId: item.optionId,
          productName: item.name,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          requestedWeight: item.requestedWeight,
          finalWeight: item.finalWeight,
          quantity: item.quantity,
          cuttingCharge: item.cuttingCharge,
          itemTotal: item.totalPrice,
        })),
      };
      const res = await apiClient.post('/orders', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playItemAdded();
      showToast('success', `Sent to Preparation Queue (Token #${data.data.dailyOrderNumber})`);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders-held'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to send to preparation.');
    },
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input field
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

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 h-[calc(100vh-64px)] overflow-hidden bg-surface-muted/30">
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
