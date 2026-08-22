import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, CheckCircle2, Mic, Clock, Scale, ArrowRight, Play } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Order } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { Numpad } from '../common/Numpad.js';
import { Modal } from '../common/Modal.js';
import { EmptyState } from '../common/EmptyState.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';
import { voiceService, MeatShopLexiconParser } from '../../services/voiceService.js';

export const PrepQueueDisplay: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUiStore();

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [finalWeightInput, setFinalWeightInput] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [isWeighModalOpen, setIsWeighModalOpen] = useState<boolean>(false);

  // Fetch preparation queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ['prep-queue'],
    queryFn: async () => {
      const res = await apiClient.get('/preparation/queue');
      return res.data?.data || [];
    },
    refetchInterval: 3000,
  });

  // Automatically select first pending order if none selected
  useEffect(() => {
    if (queueData && queueData.length > 0 && !activeOrder) {
      setActiveOrder(queueData[0]);
      if (queueData[0].items.length > 0) {
        setFinalWeightInput((queueData[0].items[0].requestedWeight || 1.0).toFixed(3));
      }
    }
  }, [queueData, activeOrder]);

  // Mark Ready Mutation
  const markReadyMutation = useMutation({
    mutationFn: async ({ orderId, itemsFinalWeights }: { orderId: string; itemsFinalWeights: any[] }) => {
      const res = await apiClient.post(`/preparation/${orderId}/ready`, {
        itemsFinalWeights,
      });
      return res.data;
    },
    onSuccess: (data) => {
      sound.playOrderReady();
      showToast('success', `Order #${data.data.dailyOrderNumber} marked READY for cashier!`);
      setActiveOrder(null);
      setIsWeighModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['prep-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders-ready'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to mark order ready.');
    },
  });

  const handleStartOrder = (order: Order) => {
    sound.playTap();
    setActiveOrder(order);
    setActiveItemIndex(0);
    if (order.items.length > 0) {
      setFinalWeightInput((order.items[0].requestedWeight || 1.0).toFixed(3));
    }
  };

  const handleVoiceWeight = () => {
    if (!voiceService.isSupported()) {
      showToast('warning', 'Web Speech not supported on this device.');
      return;
    }

    sound.playTap();
    setIsVoiceListening(true);

    voiceService.startListening(
      (res) => {
        // Extract weight number from transcript
        const parser = new MeatShopLexiconParser([]);
        const weight = parser.extractWeight(res.transcript);
        if (weight !== null) {
          setFinalWeightInput(weight.toFixed(3));
          sound.playItemAdded();
          setIsVoiceListening(false);
          voiceService.stopListening();
        }
      },
      (err) => {
        showToast('warning', err);
        setIsVoiceListening(false);
      },
      (listening) => setIsVoiceListening(listening)
    );
  };

  const handleCompleteActiveOrder = () => {
    if (!activeOrder) return;
    const finalWeights = activeOrder.items.map((item, idx) => ({
      itemId: item.id,
      finalWeight: idx === activeItemIndex ? parseFloat(finalWeightInput) || item.requestedWeight : item.requestedWeight,
    }));

    markReadyMutation.mutate({
      orderId: activeOrder.id,
      itemsFinalWeights: finalWeights,
    });
  };

  const pendingList = queueData || [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] p-2 md:p-4 pb-20 md:pb-4 bg-surface-muted/30 overflow-hidden">
      {/* KDS Header Banner */}
      <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl shadow-card mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
            <ChefHat size={28} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-ink-primary">
              Kitchen Preparation Display (KDS)
            </h2>
            <p className="text-xs font-semibold text-ink-muted">
              {pendingList.length} orders in queue • Cut, dress & verify weight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isVoiceListening ? 'danger' : 'secondary'}
            onClick={handleVoiceWeight}
            leftIcon={<Mic size={18} />}
            className="min-h-[46px]"
          >
            {isVoiceListening ? 'Listening for Weight...' : '🎤 Speak Weight'}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left 2 Cols: Active Cutting Station */}
        <div className="lg:col-span-2 flex flex-col bg-surface border border-border rounded-2xl p-6 shadow-card overflow-y-auto">
          {activeOrder ? (
            <div className="flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-brand-600 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
                      Token #{activeOrder.dailyOrderNumber}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-ink-primary">
                        {activeOrder.customerName || 'Walk-in Customer'}
                      </h3>
                      <span className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                        <Clock size={13} /> Waiting {Math.round((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000)} mins
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    ⚡ Cutting in Progress
                  </span>
                </div>

                {/* Items to cut list */}
                <div className="my-6 space-y-4">
                  {activeOrder.items.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveItemIndex(idx);
                        setFinalWeightInput((item.finalWeight || item.requestedWeight || 1.0).toFixed(3));
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        idx === activeItemIndex
                          ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                          : 'border-border bg-surface hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block mb-1">
                            Item {idx + 1} of {activeOrder.items.length}
                          </span>
                          <h4 className="text-xl font-black text-ink-primary">
                            🐔 {item.productName}
                          </h4>
                          {item.option && (
                            <span className="inline-block mt-2 text-sm font-bold text-brand-700 bg-brand-100/70 px-2.5 py-1 rounded-lg border border-brand-200">
                              ✂️ Cutting Style: {item.option.name}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-ink-muted uppercase block">
                            Requested Weight
                          </span>
                          <span className="text-2xl font-black text-ink-primary">
                            {item.requestedWeight ? `${item.requestedWeight.toFixed(3)} KG` : `${item.quantity} Pcs`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Actual Weight Input Bar */}
                <div className="p-5 rounded-2xl bg-surface-muted border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
                      Enter Verified Final Weight (Dressed/Cut):
                    </span>
                    <button
                      type="button"
                      onClick={handleVoiceWeight}
                      className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline"
                    >
                      <Mic size={14} /> Speak Weight ("One kilo eight hundred grams")
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-surface border-2 border-brand-500 rounded-xl px-4 py-3 text-center">
                      <span className="text-3xl font-black text-brand-700 tracking-wider">
                        {finalWeightInput || '0.000'} KG
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      onClick={() => setIsWeighModalOpen(true)}
                      className="min-h-[60px] px-6 text-sm"
                      leftIcon={<Scale size={18} />}
                    >
                      Touch Keypad
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mark Ready Button */}
              <Button
                variant="success"
                onClick={handleCompleteActiveOrder}
                isLoading={markReadyMutation.isPending}
                className="w-full min-h-[68px] text-lg font-black shadow-lg"
                rightIcon={<CheckCircle2 size={24} />}
              >
                MARK ORDER #{activeOrder.dailyOrderNumber} READY FOR CASHIER
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={<ChefHat size={36} className="text-brand-500" />}
              title="No active order selected"
              description="Select an order from the queue on the right to start cutting and dressing."
            />
          )}
        </div>

        {/* Right 1 Col: Up Next Queue */}
        <div className="flex flex-col bg-surface border border-border rounded-2xl p-4 shadow-card overflow-hidden">
          <h3 className="text-sm font-extrabold text-ink-primary mb-3 flex items-center justify-between flex-shrink-0">
            <span>Up Next in Queue</span>
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              {pendingList.length} Pending
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {pendingList.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-12">
                All orders are caught up! 🎉
              </p>
            ) : (
              pendingList.map((order: Order) => (
                <div
                  key={order.id}
                  onClick={() => handleStartOrder(order)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeOrder?.id === order.id
                      ? 'bg-brand-50 border-brand-500 shadow-sm'
                      : 'bg-surface hover:bg-surface-muted border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-brand-600">
                      Token #{order.dailyOrderNumber}
                    </span>
                    <span className="text-[11px] font-medium text-ink-muted">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-ink-primary">
                    {order.items.map((i) => `${i.productName} (${i.requestedWeight ? `${i.requestedWeight.toFixed(2)} KG` : `${i.quantity} Pcs`})`).join(', ')}
                  </h5>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px]">
                    <span className="font-semibold text-brand-700">
                      {order.items[0]?.option?.name || 'Standard Cut'}
                    </span>
                    <span className="font-bold text-ink-primary flex items-center gap-1">
                      Start <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Touch Weight Entry Modal for Prep Worker */}
      <Modal
        isOpen={isWeighModalOpen}
        onClose={() => setIsWeighModalOpen(false)}
        title="Enter Final Weight"
        subtitle="Verifying actual cut & dressed weight"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-brand-50 rounded-xl text-center border border-brand-100">
            <span className="text-3xl font-black text-brand-700">
              {finalWeightInput || '0'} KG
            </span>
          </div>

          <Numpad
            onDigit={(d) => setFinalWeightInput((prev) => (prev === '0' && d !== '.' ? d : prev + d))}
            onBackspace={() => setFinalWeightInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'))}
            onClear={() => setFinalWeightInput('0')}
            allowDecimal={true}
          />

          <Button
            variant="primary"
            onClick={() => setIsWeighModalOpen(false)}
            className="w-full min-h-[50px]"
          >
            Confirm Weight
          </Button>
        </div>
      </Modal>
    </div>
  );
};
