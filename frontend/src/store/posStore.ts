import { create } from 'zustand';
import { Product, ProductOption, CartItem, Customer, Order } from '../types/index.js';
import { sound } from '../services/soundService.js';

interface PosState {
  cart: CartItem[];
  selectedProduct: Product | null;
  selectedOption: ProductOption | null;
  currentWeightInput: string;
  selectedCustomer: Customer | null;
  discountAmount: number;
  lastRemovedItem: { item: CartItem; index: number } | null;
  heldOrders: Order[];
  readyOrders: Order[];
  activeOrderId: string | null; // If billing an existing order

  // Actions
  selectProduct: (product: Product) => void;
  selectOption: (option: ProductOption | null) => void;
  setWeightInput: (input: string) => void;
  appendWeightDigit: (digit: string) => void;
  clearWeightInput: () => void;
  setPresetWeight: (weightKg: number) => void;

  addItemToCart: (product: Product, weightOrQty: number, option?: ProductOption | null) => void;
  updateItemWeight: (cartItemId: string, newWeight: number) => void;
  updateItemCut: (cartItemId: string, option: ProductOption) => void;
  removeItem: (cartItemId: string) => void;
  undoRemove: () => void;
  clearCart: () => void;

  setCustomer: (customer: Customer | null) => void;
  setDiscount: (amount: number) => void;
  setHeldOrders: (orders: Order[]) => void;
  setReadyOrders: (orders: Order[]) => void;
  loadOrderToCart: (order: Order) => void;

  // Computed
  getTotals: () => {
    subtotal: number;
    discount: number;
    rounding: number;
    netTotal: number;
    totalItemsCount: number;
  };
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedProduct: null,
  selectedOption: null,
  currentWeightInput: '1.000',
  selectedCustomer: null,
  discountAmount: 0,
  lastRemovedItem: null,
  heldOrders: [],
  readyOrders: [],
  activeOrderId: null,

  selectProduct: (product) => {
    const defaultOption = product.options?.find((o) => o.isDefault) || product.options?.[0] || null;
    set({
      selectedProduct: product,
      selectedOption: defaultOption,
      currentWeightInput: product.pricingType === 'WEIGHT_BASED' ? '1.000' : '1',
    });
    sound.playTap();
  },

  selectOption: (option) => {
    set({ selectedOption: option });
    sound.playTap();
  },

  setWeightInput: (input) => {
    set({ currentWeightInput: input });
  },

  appendWeightDigit: (digit) => {
    const current = get().currentWeightInput;
    if (digit === '.' && current.includes('.')) return;
    if (current === '0' && digit !== '.') {
      set({ currentWeightInput: digit });
    } else {
      set({ currentWeightInput: current + digit });
    }
    sound.playTap();
  },

  clearWeightInput: () => {
    set({ currentWeightInput: '0' });
    sound.playTap();
  },

  setPresetWeight: (weightKg) => {
    set({ currentWeightInput: weightKg.toFixed(3) });
    sound.playTap();
  },

  addItemToCart: (product, weightOrQty, option) => {
    const unit = product.unit || 'KG';
    const isWeight = product.pricingType === 'WEIGHT_BASED';
    const unitPrice = product.currentSellingPrice;
    const costPrice = product.currentCostPrice;
    const cuttingCharge = option?.extraCharge || 0;

    const baseAmount = isWeight ? weightOrQty * unitPrice : weightOrQty * unitPrice;
    const totalPrice = baseAmount + cuttingCharge;

    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      code: product.code,
      name: product.name,
      unit,
      pricingType: product.pricingType,
      unitPrice,
      costPrice,
      requestedWeight: isWeight ? weightOrQty : null,
      finalWeight: isWeight ? weightOrQty : null,
      quantity: !isWeight ? weightOrQty : 1,
      optionId: option?.id || null,
      cuttingName: option?.name || (isWeight ? 'Whole' : null),
      cuttingCharge,
      totalPrice,
    };

    set((state) => ({
      cart: [...state.cart, newItem],
      selectedProduct: null,
      selectedOption: null,
      currentWeightInput: '1.000',
    }));

    sound.playItemAdded();
  },

  updateItemWeight: (cartItemId, newWeight) => {
    set((state) => ({
      cart: state.cart.map((item) => {
        if (item.id === cartItemId) {
          const baseAmount = newWeight * item.unitPrice;
          return {
            ...item,
            finalWeight: newWeight,
            requestedWeight: item.requestedWeight ?? newWeight,
            totalPrice: baseAmount + item.cuttingCharge,
          };
        }
        return item;
      }),
    }));
    sound.playTap();
  },

  updateItemCut: (cartItemId, option) => {
    set((state) => ({
      cart: state.cart.map((item) => {
        if (item.id === cartItemId) {
          const weightOrQty = item.finalWeight !== null && item.finalWeight !== undefined ? item.finalWeight : item.quantity;
          const baseAmount = weightOrQty * item.unitPrice;
          return {
            ...item,
            optionId: option.id,
            cuttingName: option.name,
            cuttingCharge: option.extraCharge,
            totalPrice: baseAmount + option.extraCharge,
          };
        }
        return item;
      }),
    }));
    sound.playTap();
  },

  removeItem: (cartItemId) => {
    const { cart } = get();
    const index = cart.findIndex((i) => i.id === cartItemId);
    if (index === -1) return;

    const removedItem = cart[index];
    set({
      cart: cart.filter((i) => i.id !== cartItemId),
      lastRemovedItem: { item: removedItem, index },
    });
    sound.playTap();
  },

  undoRemove: () => {
    const { lastRemovedItem, cart } = get();
    if (!lastRemovedItem) return;

    const newCart = [...cart];
    newCart.splice(lastRemovedItem.index, 0, lastRemovedItem.item);
    set({ cart: newCart, lastRemovedItem: null });
    sound.playItemAdded();
  },

  clearCart: () => {
    set({
      cart: [],
      selectedProduct: null,
      selectedOption: null,
      selectedCustomer: null,
      discountAmount: 0,
      activeOrderId: null,
    });
  },

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setDiscount: (amount) => set({ discountAmount: Math.max(0, amount) }),
  setHeldOrders: (orders) => set({ heldOrders: orders }),
  setReadyOrders: (orders) => set({ readyOrders: orders }),

  loadOrderToCart: (order) => {
    const cartItems: CartItem[] = order.items.map((oi) => {
      const weight = oi.finalWeight !== null && oi.finalWeight !== undefined ? oi.finalWeight : oi.requestedWeight;
      return {
        id: `${oi.productId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: oi.productId,
        code: '',
        name: oi.productName,
        unit: weight !== null ? 'KG' : 'PIECE',
        pricingType: weight !== null ? 'WEIGHT_BASED' : 'QUANTITY_BASED',
        unitPrice: oi.unitPrice,
        costPrice: oi.costPrice,
        requestedWeight: oi.requestedWeight,
        finalWeight: weight,
        quantity: oi.quantity,
        optionId: oi.optionId,
        cuttingName: oi.option?.name || null,
        cuttingCharge: oi.cuttingCharge,
        totalPrice: oi.itemTotal,
      };
    });

    set({
      cart: cartItems,
      activeOrderId: order.id,
      selectedCustomer: order.customerId ? { id: order.customerId, name: order.customerName || 'Customer', phone: '', creditBalance: 0, creditLimit: 5000, isActive: true } : null,
    });
    sound.playItemAdded();
  },

  getTotals: () => {
    const { cart, discountAmount } = get();
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const unroundedTotal = Math.max(0, subtotal - discountAmount);
    const roundedNetTotal = Math.round(unroundedTotal);
    const rounding = roundedNetTotal - unroundedTotal;

    return {
      subtotal,
      discount: discountAmount,
      rounding,
      netTotal: roundedNetTotal,
      totalItemsCount: cart.length,
    };
  },
}));
