import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Numpad } from '../common/Numpad.js';
import { apiClient } from '../../services/api.js';
import sound from '../../services/soundService.js';

export const UserPinLockModal: React.FC = () => {
  const { isPinAuthModalOpen, pinAuthContext, closePinAuth, showToast } = useUiStore();
  const { shop } = useAuthStore();

  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isPinAuthModalOpen) return null;

  const handleVerify = async () => {
    if (!pinInput || pinInput.length < 4) {
      setErrorMessage('PIN must be at least 4 digits.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await apiClient.post('/auth/verify-manager-pin', {
        pin: pinInput,
        actionName: pinAuthContext?.actionName || 'MANAGER_OVERRIDE',
      });

      if (res.data?.success) {
        sound.playPaymentSuccess();
        showToast('success', res.data.message || 'Authorization granted.');
        if (pinAuthContext?.onSuccess) {
          pinAuthContext.onSuccess();
        }
        closePinAuth();
        setPinInput('');
      } else {
        sound.playWarning();
        setErrorMessage(res.data?.message || 'Invalid Manager PIN.');
        setPinInput('');
      }
    } catch (e: any) {
      sound.playWarning();
      setErrorMessage(e.response?.data?.message || 'Authorization failed.');
      setPinInput('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isPinAuthModalOpen}
      onClose={closePinAuth}
      title="Manager PIN Authorization Required"
      subtitle={`Action: ${pinAuthContext?.actionName || 'Sensitive Operation'}`}
      maxWidth="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
          <ShieldCheck size={20} className="text-amber-700 flex-shrink-0" />
          <span>Enter 4-digit Manager / Owner security PIN to proceed.</span>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 py-3 bg-surface-muted rounded-2xl border border-border">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pinInput.length > idx
                  ? 'bg-brand-500 border-brand-500 scale-110 shadow-sm'
                  : 'bg-surface border-border'
              }`}
            />
          ))}
        </div>

        {errorMessage && (
          <div className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 p-2.5 rounded-xl text-center flex items-center justify-center gap-1.5">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Touch Numpad */}
        <Numpad
          onDigit={(d) => {
            if (pinInput.length < 6) {
              setPinInput((prev) => prev + d);
            }
          }}
          onBackspace={() => setPinInput((prev) => prev.slice(0, -1))}
          onClear={() => setPinInput('')}
          allowDecimal={false}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={closePinAuth}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleVerify}
            isLoading={isLoading}
            disabled={pinInput.length < 4}
          >
            Authorize
          </Button>
        </div>
      </div>
    </Modal>
  );
};
