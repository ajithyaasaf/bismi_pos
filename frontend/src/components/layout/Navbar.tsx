import React, { useEffect, useState } from 'react';
import { ChefHat, ShoppingBag, History, Package, Tag, Users, Receipt, BarChart3, Wrench, Mic, PauseCircle, CheckCircle2, Lock, Wifi, WifiOff, MoreHorizontal, X, LogOut } from 'lucide-react';
import { useUiStore, AppView } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { usePosStore } from '../../store/posStore.js';
import { syncService } from '../../services/syncService.js';
import sound from '../../services/soundService.js';

export const Navbar: React.FC = () => {
  const { activeView, setActiveView, setHeldDrawerOpen, setReadyDrawerOpen, setVoiceDrawerOpen, setDayCloseModalOpen } = useUiStore();
  const { user, shop, logout } = useAuthStore();
  const { heldOrders, readyOrders, cart } = usePosStore();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

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

  const mobileBottomNav: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'POS', label: 'POS', icon: <ShoppingBag size={20} /> },
    { id: 'PREP', label: 'Kitchen', icon: <ChefHat size={20} /> },
    { id: 'SALES_HISTORY', label: 'Bills', icon: <History size={20} /> },
    { id: 'REPORTS', label: 'Owner', icon: <BarChart3 size={20} /> },
  ];

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER (Desktop + Mobile Header)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="h-14 md:h-16 bg-surface border-b border-border px-3 md:px-4 flex items-center justify-between select-none shadow-sm z-30 flex-shrink-0">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-brand">
              🐔
            </div>
            <div>
              <h1 className="text-xs md:text-sm font-black text-ink-primary tracking-tight leading-none">
                BISMI POS
              </h1>
              <span className="text-[9px] md:text-[10px] font-semibold text-brand-600 truncate max-w-[120px] md:max-w-none block">
                {shop?.name || 'Fresh Chicken & Meats'}
              </span>
            </div>
          </div>

          {/* Desktop Workspace Navigation Tabs (UNTOUCHED for Desktop) */}
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
        <div className="flex items-center gap-1.5 md:gap-2.5">
          {/* Voice Trigger Button */}
          <button
            onClick={() => {
              sound.playTap();
              setVoiceDrawerOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-all touch-active"
            title="Voice Order Input (Spacebar)"
          >
            <Mic size={15} className="text-brand-600" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Ready Orders Counter Badge */}
          {readyOrders.length > 0 && (
            <button
              onClick={() => {
                sound.playTap();
                setReadyDrawerOpen(true);
              }}
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] md:text-xs animate-bounce shadow-sm"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
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
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-muted text-ink-primary border border-border font-bold text-xs hover:bg-surface-subtle"
            >
              <PauseCircle size={15} className="text-ink-muted" />
              <span>{heldOrders.length} Held</span>
            </button>
          )}

          {/* Online / Offline Sync Badge */}
          <div className="flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-xl bg-surface-muted border border-border text-[10px] md:text-[11px] font-semibold">
            {isOnline ? (
              <>
                <Wifi size={13} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold hidden sm:inline">
                  {pendingSyncCount > 0 ? `Syncing (${pendingSyncCount})` : 'Online'}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-amber-600" />
                <span className="text-amber-700 font-bold">Offline</span>
              </>
            )}
          </div>

          {/* Day Close Register Action (Desktop) */}
          <button
            onClick={() => {
              sound.playTap();
              setDayCloseModalOpen(true);
            }}
            className="hidden md:inline-flex px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-muted text-ink-secondary border border-border text-xs font-bold transition-colors"
            title="Close Register (Z-Report)"
          >
            Day Close
          </button>

          {/* Staff Lock / Switch */}
          <div className="flex items-center gap-1.5 md:gap-2 pl-1.5 md:pl-2 border-l border-border">
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
              className="p-1.5 md:p-2 rounded-xl text-ink-muted hover:text-brand-600 hover:bg-brand-50 border border-border transition-colors"
              title="Lock & Switch User"
            >
              <Lock size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE BOTTOM NAVIGATION BAR (Visible ONLY on Mobile < md) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-40 flex items-center justify-around px-2 shadow-modal safe-area-bottom">
        {mobileBottomNav.map((item) => {
          const isActive = activeView === item.id;
          const totalCartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
          return (
            <button
              key={item.id}
              onClick={() => {
                sound.playTap();
                setActiveView(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-brand-600 font-extrabold' : 'text-ink-muted font-medium'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'POS' && totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-600 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                    {totalCartCount}
                  </span>
                )}
                {item.id === 'PREP' && readyOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Trigger Button on Mobile */}
        <button
          onClick={() => {
            sound.playTap();
            setIsMobileMoreOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-ink-muted font-medium"
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE MORE MENU BOTTOM SHEET (Visible on Mobile)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink-primary/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileMoreOpen(false)}
          />
          <div className="relative bg-surface rounded-t-3xl border-t border-border p-5 shadow-modal z-10 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-ink-primary">Shop Management</span>
                <span className="text-[10px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 rounded-full text-ink-muted hover:bg-surface-muted"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
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
                      setIsMobileMoreOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold text-left transition-all ${
                      isActive
                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                        : 'bg-surface border-border text-ink-primary hover:bg-surface-muted'
                    }`}
                  >
                    <div className="text-brand-600">{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <button
                onClick={() => {
                  sound.playTap();
                  setIsMobileMoreOpen(false);
                  setDayCloseModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-muted border border-border text-xs font-extrabold text-ink-primary flex items-center justify-center gap-2 hover:bg-surface-subtle"
              >
                <span>📅 Close Register (Day End Z-Report)</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  setIsMobileMoreOpen(false);
                  logout();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-50 border border-brand-200 text-xs font-extrabold text-brand-700 flex items-center justify-center gap-2"
              >
                <LogOut size={15} />
                <span>Switch / Lock Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
