import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Scale, CheckCircle2, AlertTriangle, RefreshCw, Play, Laptop } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import { printManager, BrowserPrintAdapter, QZTrayAdapter } from '../../services/printService.js';
import sound from '../../services/soundService.js';

export const HardwareSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUiStore();

  const [printerName, setPrinterName] = useState('Epson TM-T82 Receipt');
  const [adapterType, setAdapterType] = useState<'BROWSER_PRINT' | 'QZ_TRAY' | 'NETWORK_ESC_POS'>('BROWSER_PRINT');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [autoCut, setAutoCut] = useState(true);
  const [openDrawer, setOpenDrawer] = useState(true);

  const [testReceiptText, setTestReceiptText] = useState<string | null>(null);

  const { data: hardwareConfigs, isLoading } = useQuery({
    queryKey: ['hardware-configs'],
    queryFn: async () => {
      const res = await apiClient.get('/hardware/configs');
      return res.data?.data || [];
    },
  });

  const testPrintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/hardware/test-receipt', { paperWidth });
      return res.data;
    },
    onSuccess: async (data) => {
      sound.playTap();
      const receipt = data.data;
      setTestReceiptText(receipt.plainText);

      // Trigger actual print
      await printManager.printReceipt({
        plainText: receipt.plainText,
        rawEscPosBase64: receipt.rawEscPosBase64,
      });

      showToast('success', 'Diagnostic test receipt sent to printer.');
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Test print failed.');
    },
  });

  const handleSaveConfig = () => {
    printManager.setPaperWidth(paperWidth);
    if (adapterType === 'QZ_TRAY') {
      printManager.setAdapter(new QZTrayAdapter());
    } else {
      printManager.setAdapter(new BrowserPrintAdapter());
    }

    showToast('success', `Saved printer configuration: ${adapterType} (${paperWidth})`);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] p-3 md:p-6 pb-24 md:pb-6 bg-surface-muted/30 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Hardware Integration & POS Peripherals</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Configure ESC/POS thermal receipt printers, electronic scales, and cash drawer pulses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Printer Setup Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
              <Printer size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary">Receipt Thermal Printer</h3>
              <span className="text-xs font-semibold text-emerald-700">● Ready & Connected</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-ink-secondary mb-1 block">
                Printer Communication Bridge
              </label>
              <select
                value={adapterType}
                onChange={(e) => setAdapterType(e.target.value as any)}
                className="w-full text-xs p-3 bg-surface border border-border rounded-xl font-semibold outline-none"
              >
                <option value="BROWSER_PRINT">Browser System Print Spooler (Zero-Config / Dialog)</option>
                <option value="QZ_TRAY">QZ Tray Raw ESC/POS (USB / Serial / Silent Printing)</option>
                <option value="NETWORK_ESC_POS">Direct Network TCP (Port 9100 LAN)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary mb-1 block">Paper Width</label>
              <div className="grid grid-cols-2 gap-2">
                {(['80mm', '58mm'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPaperWidth(w)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                      paperWidth === w ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface border-border text-ink-primary'
                    }`}
                  >
                    {w === '80mm' ? '80mm (Standard POS • 48 col)' : '58mm (Compact • 32 col)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted border border-border">
              <span className="text-xs font-semibold text-ink-primary">Automatic Paper Cutter</span>
              <input
                type="checkbox"
                checked={autoCut}
                onChange={(e) => setAutoCut(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted border border-border">
              <span className="text-xs font-semibold text-ink-primary">Cash Drawer Kick Pulse (RJ11)</span>
              <input
                type="checkbox"
                checked={openDrawer}
                onChange={(e) => setOpenDrawer(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => testPrintMutation.mutate()}
                isLoading={testPrintMutation.isPending}
                leftIcon={<Play size={16} />}
                className="flex-1 min-h-[48px]"
              >
                Print Diagnostic Test Receipt
              </Button>

              <Button
                variant="primary"
                onClick={handleSaveConfig}
                className="flex-1 min-h-[48px]"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Weighing Scale Integration Card */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Scale size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary">Electronic Weighing Scale</h3>
              <span className="text-xs font-semibold text-ink-muted">WebSerial / RS-232 COM Bridge</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted border border-border text-xs text-ink-secondary space-y-2">
            <p className="font-semibold text-ink-primary">
              Scale auto-read streaming protocol supports:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-muted">
              <li>ASCII continuous serial data (9600 baud, 8N1)</li>
              <li>Avery Weigh-Tronix / Essae / Citizen compatible streams</li>
              <li>Automatic tare detection and decimal weight synchronization</li>
            </ul>
          </div>

          {/* Diagnostic Receipt Preview */}
          {testReceiptText && (
            <div className="p-3 rounded-xl bg-surface-muted border border-border font-mono text-[11px] select-text max-h-56 overflow-y-auto">
              <span className="text-[10px] font-bold text-ink-muted uppercase block mb-1">
                Diagnostic Receipt Output:
              </span>
              <pre className="whitespace-pre-wrap">{testReceiptText}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
