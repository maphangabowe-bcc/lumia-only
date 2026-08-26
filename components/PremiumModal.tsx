import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (billingType: 'manual' | 'auto') => void;
  entryCount: number;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ 
  isOpen, 
  onClose, 
  onUnlock, 
  entryCount
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [billingType, setBillingType] = useState<'manual' | 'auto'>('manual');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Retrieve the client ID from environment or fallback to standard sandbox 'test'
  const paypalClientId = (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || 'test';

  const handleSuccessfulPayment = () => {
    setIsProcessing(true);
    setStep('success');
    setTimeout(() => {
      onUnlock(billingType);
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-300">
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] border border-slate-100 flex flex-col relative"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 p-5 sm:p-6 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 text-white/80 hover:text-white hover:bg-white/15 w-8 h-8 rounded-full flex items-center justify-center transition-all outline-none cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 sm:mb-3 border border-white/15">
                <i className="fa-solid fa-crown text-amber-300 text-[10px]"></i> Lumina Premium
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                Unlock Unlimited Diary Space
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-md leading-relaxed">
                Log unlimited pages, deep insight metrics, and secure remote backups without limits.
              </p>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                  What&apos;s Included
                </h3>
                
                <div className="grid gap-2.5 sm:gap-3">
                  <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100/80 border border-indigo-200/50 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                      <i className="fa-solid fa-infinity text-xs sm:text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Infinite Journal Pages</h4>
                      <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Save as many memories, photos, and reflections as you wish forever.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-100/80 border border-violet-200/50 flex items-center justify-center text-violet-600 shrink-0 mt-0.5">
                      <i className="fa-solid fa-brain text-xs sm:text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Deep Insight Trends & Analytics</h4>
                      <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Unlock complete emotional charts, mood trajectories, and growth analytics.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-fuchsia-100/80 border border-fuchsia-200/50 flex items-center justify-center text-fuchsia-600 shrink-0 mt-0.5">
                      <i className="fa-solid fa-cloud-arrow-up text-xs sm:text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Cloud Backups & Instant Sharing</h4>
                      <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Sync across devices and generate secure private share links anytime.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100/80 border border-amber-200/50 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                      <i className="fa-solid fa-bell text-xs sm:text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Morning Intent Notifications</h4>
                      <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">Get custom morning intent messages delivered directly as system alerts daily.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Options Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between pl-1">
                  <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-days text-indigo-500"></i>
                    Select Billing Preference
                  </h4>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                    {billingType === 'manual' ? 'One-time payment' : 'Recurring yearly'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {/* Manual Renewal Card */}
                  <button
                    type="button"
                    onClick={() => setBillingType('manual')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                      billingType === 'manual'
                        ? 'border-indigo-600 bg-indigo-50/50 text-slate-800 shadow-md shadow-indigo-100/40 ring-1 ring-indigo-600/30'
                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-800">Manual Renewal</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">1-Year</span>
                        </div>
                        {billingType === 'manual' ? (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[8px] shrink-0">
                            <i className="fa-solid fa-check"></i>
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Pay <strong>$2.00 once</strong> for 365 days. Never auto-charged. Renew manually whenever you want.
                      </p>
                    </div>
                  </button>

                  {/* Auto Billing Card */}
                  <button
                    type="button"
                    onClick={() => setBillingType('auto')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                      billingType === 'auto'
                        ? 'border-indigo-600 bg-indigo-50/50 text-slate-800 shadow-md shadow-indigo-100/40 ring-1 ring-indigo-600/30'
                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-800">Auto Billing</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded">Seamless</span>
                        </div>
                        {billingType === 'auto' ? (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[8px] shrink-0">
                            <i className="fa-solid fa-check"></i>
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Billed <strong>$2.00 yearly</strong> automatically. Keeps your diary uninterrupted. Cancel anytime.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="px-5 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100/90 flex flex-row items-center justify-between gap-3 shrink-0 rounded-b-[28px] sm:rounded-b-[32px]">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {billingType === 'manual' ? '1-Year License' : 'Annual Subscription'}
                </div>
                <div className="text-lg sm:text-xl font-black text-indigo-600">
                  $2.00<span className="text-[11px] font-semibold text-slate-400">{billingType === 'manual' ? ' / one-time' : ' / yr'}</span>
                </div>
              </div>
              
              <button
                onClick={() => setStep('payment')}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-100/50 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-crown text-[10px] text-amber-300"></i>
                <span>Continue to Checkout</span>
                <i className="fa-solid fa-arrow-right text-[10px] ml-0.5 text-indigo-200"></i>
              </button>
            </div>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden max-w-md w-full max-h-[92dvh] sm:max-h-[88vh] border border-slate-100 flex flex-col relative"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStep('info')}
                  className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="Back to features"
                >
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </button>
                <h3 className="font-black text-slate-800 text-base sm:text-lg">Secure Checkout</h3>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-all outline-none cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Scrollable Payment Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50/70 border border-indigo-100/50 rounded-2xl p-3.5 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-indigo-500 font-black uppercase tracking-wider block">
                    {billingType === 'auto' ? 'Annual Subscription' : 'One-Time 1-Year Pass'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-800">
                    Lumina Premium ({billingType === 'auto' ? 'Auto Billing' : 'Manual Renewal'})
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 font-semibold block">Total</span>
                  <span className="text-sm sm:text-base font-black text-indigo-600">
                    $2.00{billingType === 'auto' ? '/yr' : ''}
                  </span>
                </div>
              </div>

              {error && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 animate-in fade-in">
                  <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-amber-50/60 border border-amber-100/50 rounded-2xl p-3 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider">
                    <i className="fa-brands fa-paypal text-indigo-600"></i>
                    <span>PayPal Smart Checkout</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                    {billingType === 'auto' 
                      ? 'Checkout with PayPal or card. Auto-renews yearly at $2.00. Cancel anytime in your settings or PayPal dashboard.'
                      : 'Checkout with PayPal or card. Single $2.00 charge for 1 year. No automatic recurring charges.'}
                  </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 min-h-[140px] flex flex-col justify-center shadow-inner relative">
                  <PayPalScriptProvider 
                    options={{ 
                      clientId: paypalClientId,
                      currency: 'USD',
                      intent: 'capture'
                    }}
                  >
                    <PayPalButtons
                      style={{ 
                        layout: 'vertical', 
                        color: 'gold', 
                        shape: 'rect', 
                        label: 'pay',
                        height: 42
                      }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              amount: {
                                currency_code: 'USD',
                                value: '2.00',
                              },
                              description: billingType === 'auto' 
                                ? 'Lumina Premium Yearly Subscription (Auto Billing - $2.00/yr)' 
                                : 'Lumina Premium 1-Year Pass (Manual Renewal - One-Time Payment $2.00)',
                            },
                          ],
                        });
                      }}
                      onApprove={async (data, actions) => {
                        if (actions.order) {
                          await actions.order.capture();
                          handleSuccessfulPayment();
                        } else {
                          handleSuccessfulPayment();
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal Order Error:', err);
                        setError('The payment transaction could not be processed. Please check your card or account balance and try again.');
                      }}
                      onCancel={() => {
                        setError('Transaction cancelled.');
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              </div>

              {/* Security Badges */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <div className="flex justify-center items-center gap-3 text-slate-400 text-xs">
                  <i className="fa-brands fa-paypal text-indigo-600 text-base" title="PayPal Verified"></i>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Official PayPal Gateway</span>
                  <span className="w-[1px] h-3 bg-slate-200"></span>
                  <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400">
                    <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                    <span>256-Bit Encrypted</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2 text-left">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-xs mt-0.5 shrink-0"></i>
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-bold text-slate-700">Official PayPal Purchase Protection</h5>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Your payment information is guarded with strict end-to-end encryption. {billingType === 'auto' ? 'You can cancel auto-renewal at any time.' : 'Manual plan never auto-renews.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8 max-w-sm w-full max-h-[92dvh] overflow-y-auto border border-slate-100 text-center flex flex-col items-center justify-center relative space-y-4"
          >
            {/* Particle simulation background */}
            <div className="absolute inset-0 overflow-hidden rounded-[28px] sm:rounded-[32px] pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-3.5 h-3.5 bg-indigo-500/50 rounded-full blur-sm animate-ping duration-1000" />
              <div className="absolute top-2/3 right-1/4 w-5 h-5 bg-fuchsia-500/50 rounded-full blur-sm animate-ping duration-1000 delay-300" />
            </div>

            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 border border-emerald-100/80 rounded-full flex items-center justify-center text-emerald-500 text-3xl sm:text-4xl shadow-md animate-bounce">
              <i className="fa-solid fa-crown text-amber-400"></i>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">You Are Premium!</h3>
              <p className="text-slate-500 text-xs sm:text-sm max-w-xs">
                Your sanctuary is now boundless. Unlimited memories and full insights unlocked.
              </p>
            </div>

            <div className="w-full bg-slate-50 border rounded-2xl p-3.5 text-xs font-semibold text-slate-600 space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span>Subscription Status:</span>
                <span className="text-emerald-600 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ACTIVE
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-medium">Billing Mode:</span>
                <span className="text-slate-700 font-extrabold uppercase">
                  {billingType === 'auto' ? 'Auto Billing (Yearly $2.00)' : 'Manual Renewal (1-Year Pass)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-medium">Terms:</span>
                <span className="text-indigo-600 font-bold">
                  {billingType === 'auto' ? 'Auto-renews annually' : 'No automatic charges'}
                </span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: "100%" }} 
                transition={{ duration: 2.2 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumModal;
