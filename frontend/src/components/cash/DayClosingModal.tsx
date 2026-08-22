import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, FileText, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import { printManager } from '../../services/printService.js';
import sound from '../../services/soundService.js';

export const DayClosingModal: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDayCloseModalOpen, setDayCloseModalOpen, showToast, requestPinAuth } = useUiStore();

  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [zReportData, setZReportData] = useState<any>(null);

  const { data: session } = useQuery({
    queryKey: ['cash-session-active'],
    queryFn: async () => {
      const res = await apiClient.get('/cash/active');
      return res.data?.data || null;
    },
    enabled: isDayCloseModalOpen,
  });

  const closeDayMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/cash/close', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playPaymentSuccess();
      showToast('success', data.message || 'Business day register closed.');
      setZReportData(data.data.zReport);
      queryClient.invalidateQueries({ queryKey: ['cash-session-active'] });
      queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Day closing failed.');
    },
  });

  const handleConfirmClose = () => {
    requestPinAuth('Close Business Register Day', () => {
      closeDayMutation.mutate({
        actualCash: parseFloat(actualCashInput),
        notes: closingNotes,
        pin: '1111', // Approved by manager
      });
    });
  };

  const parsedActual = parseFloat(actualCashInput) || 0;
  const expectedCash = session?.expectedCash || 0;
  const cashDifference = parsedActual - expectedCash;

  const handlePrintZReport = () => {
    if (!zReportData) return;
    const lines = [
      '================================',
      '       BISMI CHICKEN POS        ',
      '     DAILY REGISTER Z-REPORT    ',
      '================================',
      `Shift Start: ${new Date(zReportData.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Shift End:   ${new Date(zReportData.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Approved By: ${zReportData.approvedBy}`,
      '--------------------------------',
      `Total Completed Bills: ${zReportData.totalBills}`,
      `Total Revenue:       ₹${zReportData.totalRevenue.toFixed(2)}`,
      `UPI Collections:     ₹${zReportData.upiRevenue.toFixed(2)}`,
      '--------------------------------',
      `Opening Float:       ₹${zReportData.openingCash.toFixed(2)}`,
      `Cash Sales:         +₹${zReportData.cashSales.toFixed(2)}`,
      `Cash Expenses:      -₹${zReportData.cashExpenses.toFixed(2)}`,
      `Expected Cash:       ₹${zReportData.expectedCash.toFixed(2)}`,
      `Actual Counted:      ₹${zReportData.actualCash.toFixed(2)}`,
      `Cash Difference:    ${zReportData.difference >= 0 ? '+' : ''}₹${zReportData.difference.toFixed(2)}`,
      '================================',
      '      REGISTER CLOSED & LOCKED   ',
      '================================',
    ];

    printManager.printReceipt({
      plainText: lines.join('\n'),
    });
    showToast('success', 'Z-Report sent to thermal printer.');
  };

  if (!isDayCloseModalOpen) return null;

  return (
    <Modal
      isOpen={isDayCloseModalOpen}
      onClose={() => setDayCloseModalOpen(false)}
      title="Close Business Day Register (Z-Report)"
      subtitle="Reconciles physical cash in drawer against recorded sales and expenses."
      maxWidth="lg"
    >
      {zReportData ? (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-2" />
            <h3 className="text-lg font-black text-emerald-900">Day Register Successfully Closed</h3>
            <p className="text-xs font-semibold text-emerald-800 mt-0.5">
              Financial records for this shift are frozen and locked into audit history.
            </p>
          </div>

          <div className="bg-surface-muted rounded-xl p-4 border border-border font-mono text-xs space-y-1.5 select-text">
            <div className="flex justify-between">
              <span>Total Revenue:</span>
              <span className="font-bold">₹{zReportData.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Expected Cash in Drawer:</span>
              <span className="font-bold">₹{zReportData.expectedCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Cash Counted:</span>
              <span className="font-bold">₹{zReportData.actualCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-bold">
              <span>Cash Discrepancy:</span>
              <span className={zReportData.difference < 0 ? 'text-brand-700' : 'text-emerald-700'}>
                {zReportData.difference >= 0 ? '+' : ''}₹{zReportData.difference.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handlePrintZReport}
              leftIcon={<Printer size={16} />}
            >
              Print Z-Report
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setZReportData(null);
                setDayCloseModalOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {session ? (
            <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Shift Opened:</span>
                <span className="font-bold text-ink-primary">
                  {new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Opening Cash Float:</span>
                <span className="font-bold text-ink-primary">₹{session.openingCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Recorded Cash Sales:</span>
                <span className="font-bold text-emerald-700">+₹{session.totalCashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Cash Expenses Paid:</span>
                <span className="font-bold text-brand-700">-₹{session.totalCashExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black border-t border-border pt-1.5 text-ink-primary">
                <span>Expected Drawer Cash:</span>
                <span className="text-base">₹{session.expectedCash.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No open session found.</p>
          )}

          <Input
            label="Actual Counted Physical Cash (₹)"
            type="number"
            placeholder="Count all physical currency notes & coins"
            value={actualCashInput}
            onChange={(e) => setActualCashInput(e.target.value)}
            autoFocus
          />

          {actualCashInput !== '' && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              cashDifference === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : cashDifference > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <span>Difference:</span>
              <span className="text-base font-extrabold">
                {cashDifference >= 0 ? `+₹${cashDifference.toFixed(2)} (Excess)` : `-₹${Math.abs(cashDifference).toFixed(2)} (Shortage)`}
              </span>
            </div>
          )}

          <Input
            label="Closing Remarks / Shift Notes"
            placeholder="e.g. End of evening shift closing balance verified"
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setDayCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleConfirmClose}
              disabled={!actualCashInput}
              isLoading={closeDayMutation.isPending}
              leftIcon={<Lock size={16} />}
            >
              Verify & Close Day
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
