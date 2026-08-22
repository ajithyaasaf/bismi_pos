import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, CreditCard, Search, Phone, MapPin } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Customer } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export const CustomerList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomerForRepay, setSelectedCustomerForRepay] = useState<Customer | null>(null);

  // New Customer State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000');

  // Repayment State
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repayMode, setRepayMode] = useState('CASH');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await apiClient.get('/customers', { params: { search: search || undefined } });
      return res.data?.data || [];
    },
  });

  // Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/customers', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Customer created.');
      setIsAddCustomerOpen(false);
      setName('');
      setPhone('');
      setAddress('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to add customer.');
    },
  });

  // Repayment Mutation
  const repayMutation = useMutation({
    mutationFn: async ({ id, amount, notes, paymentMode }: any) => {
      const res = await apiClient.post(`/customers/${id}/repay`, { amount, notes, paymentMode });
      return res.data;
    },
    onSuccess: (data) => {
      sound.playPaymentSuccess();
      showToast('success', data.message || 'Repayment collected.');
      setSelectedCustomerForRepay(null);
      setRepayAmount('');
      setRepayNotes('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to collect payment.');
    },
  });

  const handleSaveCustomer = () => {
    createCustomerMutation.mutate({
      name,
      phone,
      address,
      creditLimit: parseFloat(creditLimit),
    });
  };

  const handleCollectRepayment = () => {
    if (!selectedCustomerForRepay) return;
    repayMutation.mutate({
      id: selectedCustomerForRepay.id,
      amount: parseFloat(repayAmount),
      notes: repayNotes,
      paymentMode: repayMode,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] p-6 bg-surface-muted/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Customer Directory & Credit (Udhaar)</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Track regular customers, purchase history, and outstanding credit balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-border rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            />
          </div>

          <Button
            variant="primary"
            onClick={() => setIsAddCustomerOpen(true)}
            leftIcon={<UserPlus size={16} />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Grid / Table */}
      <div className="flex-1 bg-surface border border-border rounded-2xl shadow-card my-4 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted border-b border-border sticky top-0 font-bold text-ink-secondary">
              <tr>
                <th className="p-3.5 pl-6">Customer Name</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Address</th>
                <th className="p-3.5">Credit Balance (Due)</th>
                <th className="p-3.5">Credit Limit</th>
                <th className="p-3.5 pr-6 text-right">Collect Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted">Loading customers...</td>
                </tr>
              ) : (
                customers?.map((cust: Customer) => (
                  <tr key={cust.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-ink-primary text-sm">
                      {cust.name}
                    </td>
                    <td className="p-3.5 text-ink-secondary font-mono">
                      {cust.phone}
                    </td>
                    <td className="p-3.5 text-ink-muted">
                      {cust.address || '—'}
                    </td>
                    <td className="p-3.5">
                      {cust.creditBalance > 0 ? (
                        <span className="font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-md text-xs">
                          ₹{cust.creditBalance.toFixed(2)} Due
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          ₹0.00 (All Cleared)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-ink-secondary font-semibold">
                      ₹{cust.creditLimit.toFixed(2)}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedCustomerForRepay(cust);
                          setRepayAmount(cust.creditBalance.toString());
                        }}
                        disabled={cust.creditBalance <= 0}
                        leftIcon={<CreditCard size={14} className="text-emerald-600" />}
                      >
                        Collect Due
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add Customer Profile"
        maxWidth="md"
      >
        <div className="flex flex-col gap-3">
          <Input label="Customer / Hotel Name" placeholder="e.g. Hotel Taj / Karthik" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label="Mobile Phone Number" placeholder="e.g. 9840123456" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Shop / Delivery Address" placeholder="e.g. 42 Mosque Street" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Credit Limit (₹)" type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveCustomer} isLoading={createCustomerMutation.isPending}>Save Customer</Button>
          </div>
        </div>
      </Modal>

      {/* Collect Repayment Modal */}
      {selectedCustomerForRepay && (
        <Modal
          isOpen={!!selectedCustomerForRepay}
          onClose={() => setSelectedCustomerForRepay(null)}
          title={`Collect Udhaar: ${selectedCustomerForRepay.name}`}
          subtitle={`Total Outstanding Balance: ₹${selectedCustomerForRepay.creditBalance.toFixed(2)}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 flex justify-between items-center">
              <span className="text-xs font-bold text-brand-800">Current Outstanding:</span>
              <span className="text-2xl font-black text-brand-700">₹{selectedCustomerForRepay.creditBalance.toFixed(2)}</span>
            </div>

            <Input
              label="Repayment Amount (₹)"
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              autoFocus
            />

            <div>
              <label className="text-xs font-bold text-ink-secondary mb-1 block">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['CASH', 'UPI'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRepayMode(m)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      repayMode === m ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface border-border text-ink-primary'
                    }`}
                  >
                    {m === 'CASH' ? '💵 Cash' : '📱 UPI'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Notes"
              placeholder="e.g. Morning partial payment"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
            />

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedCustomerForRepay(null)}>Cancel</Button>
              <Button variant="success" className="flex-1" onClick={handleCollectRepayment} isLoading={repayMutation.isPending}>Record Repayment</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
