import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore.js';
import { useUiStore } from './store/uiStore.js';
import { Navbar } from './components/layout/Navbar.js';
import { ToastContainer } from './components/common/Toast.js';
import { UserPinLockModal } from './components/layout/UserPinLockModal.js';
import { DayClosingModal } from './components/cash/DayClosingModal.js';

// Views
import { PosWorkspace } from './components/pos/PosWorkspace.js';
import { PrepQueueDisplay } from './components/prep/PrepQueueDisplay.js';
import { SalesHistory } from './components/sales/SalesHistory.js';
import { ProductManagement } from './components/products/ProductManagement.js';
import { InventoryView } from './components/inventory/InventoryView.js';
import { CustomerList } from './components/customers/CustomerList.js';
import { ExpenseTracker } from './components/expenses/ExpenseTracker.js';
import { OwnerDashboard } from './components/reports/OwnerDashboard.js';
import { HardwareSettings } from './components/hardware/HardwareSettings.js';

// Common
import { Button } from './components/common/Button.js';
import { Input } from './components/common/Input.js';
import sound from './services/soundService.js';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, initialize, login } = useAuthStore();
  const { activeView } = useUiStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    sound.playTap();

    const res = await login(username, password);
    if (!res.success) {
      setLoginError(res.message || 'Invalid credentials.');
    } else {
      sound.playPaymentSuccess();
    }
    setIsLoggingIn(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-2xl font-black shadow-brand animate-pulse">
            🐔
          </div>
          <span className="text-sm font-bold text-ink-secondary">Loading Bismi POS...</span>
        </div>
      </div>
    );
  }

  // Login Screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-muted/60 p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-modal flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center text-white text-3xl font-black shadow-brand mb-3">
              🐔
            </div>
            <h2 className="text-2xl font-black text-ink-primary tracking-tight">BISMI POS</h2>
            <p className="text-xs font-semibold text-brand-600 mt-1">
              Fresh Chicken & Meat High-Velocity Billing
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <Input
              label="Username"
              placeholder="e.g. admin or cashier"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {loginError && (
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs font-bold text-brand-700 text-center">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoggingIn}
              className="w-full min-h-[50px] text-base font-bold shadow-brand mt-2"
            >
              Sign In to POS
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-border flex flex-col gap-1 text-[11px] text-ink-muted">
            <span className="font-bold text-ink-secondary">Demo Accounts:</span>
            <div className="grid grid-cols-2 gap-1 text-ink-muted">
              <span>👑 Owner: <b>admin</b> (1111)</span>
              <span>💼 Manager: <b>manager</b> (2222)</span>
              <span>⚡ Cashier: <b>cashier</b> (1234)</span>
              <span>🔪 Prep: <b>prep</b> (3333)</span>
            </div>
            <span className="text-[10px] text-ink-light mt-1">Password for all accounts: <b>admin123</b> / <b>cashier123</b></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface">
      <Navbar />

      <main className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'POS' && <PosWorkspace />}
        {activeView === 'PREP' && <PrepQueueDisplay />}
        {activeView === 'SALES_HISTORY' && <SalesHistory />}
        {activeView === 'PRODUCTS' && <ProductManagement />}
        {activeView === 'INVENTORY' && <InventoryView />}
        {activeView === 'CUSTOMERS' && <CustomerList />}
        {activeView === 'EXPENSES' && <ExpenseTracker />}
        {activeView === 'REPORTS' && <OwnerDashboard />}
        {activeView === 'HARDWARE' && <HardwareSettings />}
      </main>

      {/* Global Overlays */}
      <ToastContainer />
      <UserPinLockModal />
      <DayClosingModal />
    </div>
  );
};

export default App;
