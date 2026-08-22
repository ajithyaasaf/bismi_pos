import { create } from 'zustand';

export type AppView =
  | 'POS'
  | 'PREP'
  | 'SALES_HISTORY'
  | 'PRODUCTS'
  | 'INVENTORY'
  | 'CUSTOMERS'
  | 'EXPENSES'
  | 'CASH_REGISTER'
  | 'REPORTS'
  | 'HARDWARE';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  duration?: number;
}

interface UiState {
  activeView: AppView;
  toasts: ToastMessage[];
  isPaymentModalOpen: boolean;
  isSuccessModalOpen: boolean;
  isHeldDrawerOpen: boolean;
  isReadyDrawerOpen: boolean;
  isVoiceDrawerOpen: boolean;
  isPriceUpdateModalOpen: boolean;
  isDayCloseModalOpen: boolean;
  isPinAuthModalOpen: boolean;
  pinAuthContext?: {
    actionName: string;
    onSuccess: () => void;
  };
  lastCompletedSale?: any;

  // Actions
  setActiveView: (view: AppView) => void;
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  setPaymentModalOpen: (open: boolean) => void;
  setSuccessModalOpen: (open: boolean, saleData?: any) => void;
  setHeldDrawerOpen: (open: boolean) => void;
  setReadyDrawerOpen: (open: boolean) => void;
  setVoiceDrawerOpen: (open: boolean) => void;
  setPriceUpdateModalOpen: (open: boolean) => void;
  setDayCloseModalOpen: (open: boolean) => void;

  requestPinAuth: (actionName: string, onSuccess: () => void) => void;
  closePinAuth: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeView: 'POS',
  toasts: [],
  isPaymentModalOpen: false,
  isSuccessModalOpen: false,
  isHeldDrawerOpen: false,
  isReadyDrawerOpen: false,
  isVoiceDrawerOpen: false,
  isPriceUpdateModalOpen: false,
  isDayCloseModalOpen: false,
  isPinAuthModalOpen: false,

  setActiveView: (view) => set({ activeView: view }),

  showToast: (type, message, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));

    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setPaymentModalOpen: (open) => set({ isPaymentModalOpen: open }),
  setSuccessModalOpen: (open, saleData) => set({ isSuccessModalOpen: open, lastCompletedSale: saleData }),
  setHeldDrawerOpen: (open) => set({ isHeldDrawerOpen: open }),
  setReadyDrawerOpen: (open) => set({ isReadyDrawerOpen: open }),
  setVoiceDrawerOpen: (open) => set({ isVoiceDrawerOpen: open }),
  setPriceUpdateModalOpen: (open) => set({ isPriceUpdateModalOpen: open }),
  setDayCloseModalOpen: (open) => set({ isDayCloseModalOpen: open }),

  requestPinAuth: (actionName, onSuccess) => {
    set({
      isPinAuthModalOpen: true,
      pinAuthContext: { actionName, onSuccess },
    });
  },

  closePinAuth: () => {
    set({ isPinAuthModalOpen: false, pinAuthContext: undefined });
  },
}));
