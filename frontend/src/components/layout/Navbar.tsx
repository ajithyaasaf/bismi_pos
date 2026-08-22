import React, { useEffect, useState } from 'react';
import { ChefHat, ShoppingBag, History, Package, Tag, Users, Receipt, BarChart3, Wrench, Mic, PauseCircle, CheckCircle2, Lock, Wifi, WifiOff } from 'lucide-react';
import { useUiStore, AppView } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { usePosStore } from '../../store/posStore.js';
import { syncService } from '../../services/syncService.js';
import sound from '../../services/soundService.js';

export const Navbar: React.FC = () => {
  const { activeView, setActiveView, setHeldDrawerOpen, setReadyDrawerOpen, setVoiceDrawerOpen, setDayCloseModalOpen } = useUiStore();
  const { user, shop, logout } = useAuthStore();
  const { heldOrders, readyOrders } = usePosStore();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncService.subscribe((count) => {
      setPendingSyncCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const navItems: { id: AppView; label: string; icon: React.ReactNode; roles?: string[] }[] = [
    { id: 'POS', label: 'POS Billing', icon: <ShoppingBag size={16} /> },
    { id: 'PREP', label: 'Prep KDS', icon: <ChefHat size={16} /> },
    { id: 'SALES_HISTORY', label: 'Bills History', icon: <History size={16} /> },
    { id: 'PRODUCTS', label: 'Products & Rates', icon: <Tag size={16} />, roles: ['OWNER', 'MANAGER'] },
    { id: 'INVENTORY', label: 'Inventory', icon: <Package size={16} />, roles: ['OWNER', 'MANAGER'] },
    { id: 'CUSTOMERS', label: 'Customers', icon: <Users size={16} /> },
    { id: 'EXPENSES', label: 'Expenses', icon: <Receipt size={16} /> },
    { id: 'REPORTS', label: 'Dashboard', icon: <BarChart3 size={16} />, roles: ['OWNER', 'MANAGER'] },
    { id: 'HARDWARE', label: 'Hardware', icon: <Wrench size={16} /> },
  ];

  return (
    <header className="h-16 bg-surface border-b border-border px-4 flex items-center justify-between select-none shadow-sm z-30 flex-shrink-0">
      {/* Brand & Store Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black text-xl shadow-brand">
            🐔
          </div>
          <div>
            <h1 className="text-sm font-black text-ink-primary tracking-tight leading-none">
              BISMI POS
            </h1>
            <span className="text-[10px] font-semibold text-brand-600">
              {shop?.name || 'Fresh Chicken & Meats'}
            </span>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 ml-3">
          {navItems.map((item) => {
            const isAuthorized = !item.roles || (user && item.roles.includes(user.role));
            if (!isAuthorized) return null;

            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playTap();
                  setActiveView(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all touch-active ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-muted'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Operational Badges & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Voice Trigger Button */}
        <button
          onClick={() => {
            sound.playTap();
            setVoiceDrawerOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-all touch-active"
          title="Voice Order Input (Spacebar)"
        >
          <Mic size={16} className="text-brand-600" />
          <span className="hidden sm:inline">Voice (Space)</span>
        </button>

        {/* Ready Orders Counter Badge */}
        {readyOrders.length > 0 && (
          <button
            onClick={() => {
              sound.playTap();
              setReadyDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs animate-bounce shadow-sm"
          >
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{readyOrders.length} Ready</span>
          </button>
        )}

        {/* Held Orders Counter Badge */}
        {heldOrders.length > 0 && (
          <button
            onClick={() => {
              sound.playTap();
              setHeldDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-muted text-ink-primary border border-border font-bold text-xs hover:bg-surface-subtle"
          >
            <PauseCircle size={15} className="text-ink-muted" />
            <span>{heldOrders.length} Held</span>
          </button>
        )}

        {/* Online / Offline Sync Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-muted border border-border text-[11px] font-semibold">
          {isOnline ? (
            <>
              <Wifi size={13} className="text-emerald-600" />
              <span className="text-emerald-700 font-bold">
                {pendingSyncCount > 0 ? `Syncing (${pendingSyncCount})` : 'Online'}
              </span>
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-amber-600" />
              <span className="text-amber-700 font-bold">
                Offline {pendingSyncCount > 0 && `(${pendingSyncCount} saved)`}
              </span>
            </>
          )}
        </div>

        {/* Day Close Register Action */}
        <button
          onClick={() => {
            sound.playTap();
            setDayCloseModalOpen(true);
          }}
          className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-muted text-ink-secondary border border-border text-xs font-bold transition-colors"
          title="Close Register (Z-Report)"
        >
          Day Close
        </button>

        {/* Staff Lock / Switch */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-extrabold text-ink-primary block leading-none">
              {user?.name || 'Cashier'}
            </span>
            <span className="text-[10px] font-bold text-brand-600 uppercase">
              {user?.role}
            </span>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              logout();
            }}
            className="p-2 rounded-xl text-ink-muted hover:text-brand-600 hover:bg-brand-50 border border-border transition-colors"
            title="Lock & Switch User"
          >
            <Lock size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
