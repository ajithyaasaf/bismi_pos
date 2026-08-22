import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, DollarSign, Calendar } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export const ExpenseTracker: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUiStore();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [category, setCategory] = useState('Ice & Cold Storage');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [description, setDescription] = useState('');

  const expenseCategories = [
    'Ice & Cold Storage',
    'Shop Rent',
    'Electricity Bill',
    'Packaging & Plastic Bags',
    'Staff Meals & Tea',
    'Transport & Delivery Auto',
    'Cleaning & Hygiene Supplies',
    'Maintenance & Knife Sharpening',
    'Other Expenses',
  ];

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses');
      return res.data?.data || [];
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/expenses', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Expense recorded.');
      setIsAddExpenseOpen(false);
      setAmount('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cash-session-active'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to record expense.');
    },
  });

  const handleSaveExpense = () => {
    createExpenseMutation.mutate({
      category,
      amount: parseFloat(amount),
      paymentMode,
      description,
    });
  };

  const totalExpenseSum = expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] p-3 md:p-6 pb-24 md:pb-6 bg-surface-muted/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Shop Operational Expenses</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Log daily cash and UPI outflows (Ice, Rent, Electricity, Packaging, Wages)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <span className="text-[10px] font-bold text-ink-muted uppercase">Total Expenses Recorded</span>
            <div className="text-lg font-black text-brand-700">₹{totalExpenseSum.toFixed(2)}</div>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsAddExpenseOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 bg-surface border border-border rounded-2xl shadow-card my-4 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted border-b border-border sticky top-0 font-bold text-ink-secondary">
              <tr>
                <th className="p-3.5 pl-6">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-muted">Loading expenses...</td>
                </tr>
              ) : expenses?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-muted">No expenses recorded yet.</td>
                </tr>
              ) : (
                expenses?.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-ink-secondary">
                      {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3.5 font-bold text-ink-primary">
                      {exp.category}
                    </td>
                    <td className="p-3.5 font-bold text-ink-secondary">
                      {exp.paymentMode === 'CASH' ? '💵 Cash' : '📱 UPI / Bank'}
                    </td>
                    <td className="p-3.5 text-ink-muted">
                      {exp.description || '—'}
                    </td>
                    <td className="p-3.5 pr-6 text-right font-extrabold text-brand-700 text-sm">
                      -₹{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Record Shop Expense"
        maxWidth="md"
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-ink-secondary mb-1 block">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-2.5 bg-surface border border-border rounded-xl outline-none"
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <Input
            label="Expense Amount (₹)"
            type="number"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          <div>
            <label className="text-xs font-bold text-ink-secondary mb-1 block">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {['CASH', 'UPI'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMode(m)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    paymentMode === m ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface border-border text-ink-primary'
                  }`}
                >
                  {m === 'CASH' ? '💵 Cash Drawer' : '📱 UPI / Bank'}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Note / Details"
            placeholder="e.g. 2 blocks of ice for storage"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleSaveExpense} isLoading={createExpenseMutation.isPending}>Record Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
