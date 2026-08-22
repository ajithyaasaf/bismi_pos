import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, DollarSign, AlertTriangle, Users, ArrowUpRight, CheckCircle2, QrCode, Banknote } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Badge } from '../common/Badge.js';

export const OwnerDashboard: React.FC = () => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/dashboard');
      return res.data?.data || null;
    },
    refetchInterval: 10000,
  });

  const summary = dashboardData?.summary || {
    totalSales: 0,
    grossProfit: 0,
    totalExpenses: 0,
    estimatedNetProfit: 0,
    totalBills: 0,
    averageBillValue: 0,
    totalChickenKg: 0,
  };

  const payments = dashboardData?.paymentsBreakdown || { cash: 0, upi: 0, card: 0, credit: 0 };
  const lowStock = dashboardData?.lowStockItems || [];
  const recentSales = dashboardData?.recentSales || [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] p-6 bg-surface-muted/30 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Owner Executive Dashboard</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Real-time daily financial health, volume sold, gross profit, and operational overview
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          ● Live Shop Metrics
        </span>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Card 1: Today Sales */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-ink-primary">
              ₹{summary.totalSales.toFixed(2)}
            </div>
            <p className="text-[11px] font-semibold text-ink-muted mt-1">
              Across {summary.totalBills} completed bills
            </p>
          </div>
        </div>

        {/* Card 2: Chicken Sold (KG) */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Chicken Sold (KG)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700">
              {summary.totalChickenKg.toFixed(2)} <span className="text-sm font-bold">KG</span>
            </div>
            <p className="text-[11px] font-semibold text-ink-muted mt-1">
              Avg Bill: ₹{summary.averageBillValue.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Card 3: Estimated Net Profit */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Est. Net Profit</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-blue-700">
              ₹{summary.estimatedNetProfit.toFixed(2)}
            </div>
            <p className="text-[11px] font-semibold text-ink-muted mt-1">
              Gross: ₹{summary.grossProfit.toFixed(0)} | Exp: -₹{summary.totalExpenses.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Card 4: Outstanding Credit Due */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Market Udhaar Credit</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-800">
              ₹{(dashboardData?.creditSummary?.totalOutstanding || 0).toFixed(2)}
            </div>
            <p className="text-[11px] font-semibold text-ink-muted mt-1">
              From {dashboardData?.creditSummary?.debtorCount || 0} active credit accounts
            </p>
          </div>
        </div>
      </div>

      {/* Second Row: Payment Breakdown & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Payment Collection Channels */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <h3 className="text-sm font-extrabold text-ink-primary mb-4">Payment Methods Breakdown</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Banknote size={18} className="text-emerald-600" />
                <span>Cash Collections</span>
              </div>
              <span className="text-base font-extrabold text-emerald-700">₹{payments.cash.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50/60 border border-brand-100">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                <QrCode size={18} className="text-brand-600" />
                <span>UPI Payments</span>
              </div>
              <span className="text-base font-extrabold text-brand-700">₹{payments.upi.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Users size={18} className="text-amber-600" />
                <span>Credit (Udhaar) Given</span>
              </div>
              <span className="text-base font-extrabold text-amber-800">₹{payments.credit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Low Stock Warning Box */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-card flex flex-col">
          <h3 className="text-sm font-extrabold text-ink-primary mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span>Low Stock Inventory Alerts</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">All inventory stock levels are healthy.</p>
            ) : (
              lowStock.map((item: any) => (
                <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-200">
                  <div>
                    <h5 className="text-xs font-bold text-ink-primary">{item.productName}</h5>
                    <span className="text-[11px] font-semibold text-amber-800">Below threshold warning</span>
                  </div>
                  <span className="text-sm font-extrabold text-amber-900">
                    {item.currentStockKg ? `${item.currentStockKg.toFixed(2)} KG` : `${item.currentStockUnits} Units`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
