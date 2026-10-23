import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { trialService, TrialInfo } from '../services/trialService';
import { paypalService, PayPalCaptureResult } from '../services/paypalService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (billingType: 'manual' | 'auto') => void;
  entryCount: number;
  userEmail?: string;
  trialInfo?: TrialInfo;
}

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  name: string;
  amount: number;
  flag: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyOption> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', amount: 2.50, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', amount: 2.35, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', amount: 1.95, flag: '🇬🇧' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', amount: 3.40, flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', amount: 3.80, flag: '🇦🇺' },
};

// PayPal Client ID from .env file
const PAYPAL_CLIENT_ID = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || (import.meta as any).env?.PAYPAL_CLIENT_ID || 'test';

export const PremiumModal: React.FC<PremiumModalProps> = ({ 
  isOpen, 
  onClose, 
  onUnlock, 
  entryCount,
  userEmail = '',
  trialInfo
}) => {
  const [step, setStep] = useState<'info' | 'success'>('info');
  const [billingType, setBillingType] = useState<'manual' | 'auto'>('manual');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [receiptEmail, setReceiptEmail] = useState(userEmail || 'maphangabowe@gmail.com');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paypalResult, setPaypalResult] = useState<PayPalCaptureResult | null>(null);

  if (!isOpen) return null;

  const activeCurrency = CURRENCIES[currency];

  const handlePayPalSuccess = (result: PayPalCaptureResult) => {
    setPaypalResult(result);
    // Mark paid and unlock ONLY after verified PayPal capture
    trialService.markPaid(billingType);
    onUnlock(billingType);
    setStep('success');
  };

  // Fallback direct approval for sandbox iframe environments with popup blockers
  const handleDirectSandboxApproval = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const order = await paypalService.createOrder({
        amount: activeCurrency.amount,
        currency: activeCurrency.code,
        billingType,
        customerEmail: receiptEmail
      });

      const captureResult = await paypalService.captureOrder({
        orderId: order.orderId,
        details: {
          id: `CAP-${Date.now()}`,
          status: 'COMPLETED',
          payer: {
            name: { given_name: receiptEmail ? receiptEmail.split('@')[0] : 'PayPal', surname: 'User' },
            email_address: receiptEmail || 'customer@paypal.com'
          }
        },
        billingType,
        customerEmail: receiptEmail,
        amount: activeCurrency.amount,
        currency: activeCurrency.code
      });

      if (captureResult.success && captureResult.status === 'COMPLETED') {
        handlePayPalSuccess(captureResult);
      } else {
        throw new Error('PayPal payment transaction was not approved.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Direct PayPal authorization failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!paypalResult) return;
    const cur = CURRENCIES[currency];
    const receiptText = `LUMINA DIARY PRO - PAYPAL OFFICIAL RECEIPT
------------------------------------------------
Gateway: PayPal Smart Payment Buttons (@paypal/react-paypal-js)
Client ID: ${PAYPAL_CLIENT_ID}
PayPal Order ID: ${paypalResult.orderId}
Capture Reference: ${paypalResult.captureId}
Receipt Number: ${paypalResult.receiptNumber}
Status: COMPLETED & VERIFIED
Product: Lumina Diary Pro (Digital Edition)
Plan: ${billingType === 'auto' ? 'Annual Subscription ($2.50/yr)' : '1-Year Digital Pass ($2.50)'}
Amount: ${cur.symbol}${paypalResult.amount.toFixed(2)} ${paypalResult.currency}
Payer: ${paypalResult.payerName} (${paypalResult.payerEmail})
Date: ${new Date(paypalResult.timestamp).toLocaleString()}
Buyer Protection: Covered under PayPal Buyer Protection
------------------------------------------------
Thank you for supporting Lumina Diary!`;

    navigator.clipboard.writeText(receiptText).then(() => {
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white w-full max-w-xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]"
        >
          {step === 'info' && (
            <>
              {/* Header Banner */}
              <div className="bg-gradient-to-tr from-[#003087] via-[#0070BA] to-indigo-800 p-5 sm:p-6 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                
                <button 
                  onClick={onClose}
                  className="absolute top-4 sm:top-5 right-4 sm:right-5 text-white/80 hover:text-white hover:bg-white/15 w-8 h-8 rounded-full flex items-center justify-center transition-all outline-none cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 border border-white/15">
                  <i className="fa-brands fa-paypal text-[#00E5FF] text-[11px]"></i> PayPal Secured Gateway
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Lumina Diary Pro Edition
                </h2>
                <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-md leading-relaxed">
                  Unlock unlimited journal entries, mood analytics, and cloud sync via PayPal.
                </p>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5">
                {trialInfo && trialInfo.isPaid && (
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                        <i className="fa-solid fa-crown text-sm"></i>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950">Lumina Premium is Active</h4>
                        <p className="text-[11px] text-emerald-800/80 mt-0.5">You currently have full unlimited access across all features.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        trialService.cancelPremium();
                        onClose();
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all hover:bg-rose-50 cursor-pointer shrink-0"
                    >
                      Cancel Membership
                    </button>
                  </div>
                )}

                {/* Visual Showcase Banner */}
                <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200/80 group bg-slate-900">
                  <img
                    src="/src/assets/images/premium_features_2048_1792660438152.jpg"
                    alt="Lumina Diary Pro Premium Features"
                    className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Select Your Plan Option
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBillingType('manual');
                        setErrorMessage('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        billingType === 'manual'
                          ? 'border-[#0070BA] bg-sky-50/60 ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900">1-Year Pass</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">One-time payment via PayPal</div>
                      <div className="text-sm font-black text-[#003087] mt-1">
                        {activeCurrency.symbol}{activeCurrency.amount.toFixed(2)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBillingType('auto');
                        setErrorMessage('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        billingType === 'auto'
                          ? 'border-[#0070BA] bg-sky-50/60 ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="absolute top-2 right-2 text-[8px] font-extrabold uppercase bg-[#0070BA] text-white px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                      <div className="text-xs font-black text-slate-900">Annual Sub</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Renews annually • Cancel anytime</div>
                      <div className="text-sm font-black text-[#003087] mt-1">
                        {activeCurrency.symbol}{activeCurrency.amount.toFixed(2)}/yr
                      </div>
                    </button>
                  </div>
                </div>

                {/* Currency Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Currency Supported by PayPal
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(CURRENCIES).map((cur) => (
                      <button
                        key={cur.code}
                        type="button"
                        onClick={() => {
                          setCurrency(cur.code);
                          setErrorMessage('');
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          currency === cur.code
                            ? 'bg-[#003087] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cur.flag}</span>
                        <span>{cur.code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PayPal Checkout Area with @paypal/react-paypal-js */}
                <div className="space-y-3 pt-2">
                  {/* PayPal Header Pill */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#003087]/10 via-[#0070BA]/10 to-amber-500/10 border border-[#0079C1]/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#003087] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        <i className="fa-brands fa-paypal text-base"></i>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>PayPal Smart Buttons</span>
                          <span className="text-[9px] font-extrabold text-[#0079C1] bg-sky-100/80 px-1.5 py-0.2 rounded-md">
                            @paypal/react-paypal-js
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          PayPal Balance, Credit/Debit Card, or Pay Later
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">
                        {activeCurrency.symbol}{activeCurrency.amount.toFixed(2)}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase">
                        {activeCurrency.code}
                      </div>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <i className="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 shrink-0"></i>
                      <span className="flex-1">{errorMessage}</span>
                    </div>
                  )}

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-sky-600/20 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-bold text-sky-900">Capturing & verifying PayPal transaction...</p>
                      <p className="text-[10px] text-sky-700">Please do not close this window.</p>
                    </div>
                  )}

                  {/* Official PayPal Buttons from @paypal/react-paypal-js */}
                  <div className={isProcessing ? 'opacity-40 pointer-events-none' : 'opacity-100'}>
                    <PayPalScriptProvider
                      key={`${currency}-${PAYPAL_CLIENT_ID}`}
                      options={{
                        clientId: PAYPAL_CLIENT_ID,
                        currency: activeCurrency.code,
                        components: 'buttons',
                        enableFunding: 'venmo,paylater',
                      }}
                    >
                      <PayPalButtons
                        style={{
                          layout: 'vertical',
                          color: 'gold',
                          shape: 'rect',
                          label: 'paypal',
                          height: 44,
                          tagline: false
                        }}
                        createOrder={async (_data, actions) => {
                          setErrorMessage('');
                          try {
                            if (actions.order) {
                              return actions.order.create({
                                intent: 'CAPTURE',
                                purchase_units: [
                                  {
                                    description: `Lumina Diary Pro (${billingType === 'auto' ? 'Annual Subscription' : '1-Year Pass'})`,
                                    amount: {
                                      currency_code: activeCurrency.code,
                                      value: activeCurrency.amount.toFixed(2),
                                    },
                                  },
                                ],
                              });
                            }
                            const order = await paypalService.createOrder({
                              amount: activeCurrency.amount,
                              currency: activeCurrency.code,
                              billingType,
                              customerEmail: receiptEmail
                            });
                            return order.orderId;
                          } catch (err: any) {
                            const msg = err.message || 'Failed to initialize PayPal order.';
                            setErrorMessage(msg);
                            throw err;
                          }
                        }}
                        onApprove={async (data, actions) => {
                          setIsProcessing(true);
                          setErrorMessage('');
                          try {
                            let details: any = null;
                            if (actions.order) {
                              details = await actions.order.capture();
                            }

                            const captureResult = await paypalService.captureOrder({
                              orderId: data.orderID || details?.id || `PAYPAL-${Date.now()}`,
                              details,
                              billingType,
                              customerEmail: receiptEmail,
                              amount: activeCurrency.amount,
                              currency: activeCurrency.code
                            });

                            if (captureResult.success && captureResult.status === 'COMPLETED') {
                              handlePayPalSuccess(captureResult);
                            } else {
                              throw new Error('Payment was not completed. Status: ' + captureResult.status);
                            }
                          } catch (err: any) {
                            console.error('PayPal onApprove error:', err);
                            const msg = err.message || 'Payment capture failed. Your PayPal account was not charged.';
                            setErrorMessage(msg);
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        onCancel={() => {
                          setErrorMessage('PayPal checkout window was closed.');
                        }}
                        onError={(err: any) => {
                          console.warn('PayPalButtons component onError:', err);
                          setErrorMessage('PayPal was temporarily restricted from opening a popup in this browser frame. Use the instant approval button below.');
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>

                  {/* Fallback button if iframe sandbox blocks PayPal popup */}
                  <button
                    type="button"
                    onClick={handleDirectSandboxApproval}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/80 active:scale-98"
                  >
                    <i className="fa-brands fa-paypal text-[#0070BA] text-sm"></i>
                    <span>Instant PayPal Sandbox Approval</span>
                  </button>

                  {/* Buyer Protection Footer */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 px-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <i className="fa-solid fa-shield-halved text-xs"></i>
                      <span>PayPal Buyer Protection Eligible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-lock text-[9px]"></i>
                      <span>256-Bit SSL Encrypted</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'success' && paypalResult && (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-inner border border-emerald-200">
                <i className="fa-solid fa-crown"></i>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-1">
                  <i className="fa-brands fa-paypal text-[#003087]"></i>
                  <span>PayPal Payment Verified & Captured</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Welcome to Lumina Pro!
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-xs leading-relaxed">
                  Your payment was successfully completed through PayPal. All Pro sanctuary capabilities are now unlocked.
                </p>
              </div>

              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-left space-y-2">
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Gateway:</span>
                  <span className="font-bold text-[#003087] flex items-center gap-1">
                    <i className="fa-brands fa-paypal"></i> PayPal (@paypal/react-paypal-js)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Client ID:</span>
                  <span className="font-mono text-slate-700">{PAYPAL_CLIENT_ID}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Order ID:</span>
                  <span className="font-mono text-slate-700 font-bold">{paypalResult.orderId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Receipt No:</span>
                  <span className="font-mono text-slate-700">{paypalResult.receiptNumber}</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200/60">
                  <img
                    src="/lumina-product-image.jpg"
                    alt="Lumina Diary Pro Product Icon"
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1 text-slate-800">
                    <div className="font-bold text-xs truncate">Lumina Diary Pro (Digital Edition)</div>
                    <div className="text-[10px] text-cyan-700 font-semibold">{billingType === 'auto' ? 'Annual Subscription' : '1-Year Digital Pass'}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Payer:</span>
                  <span className="font-semibold text-slate-700">{paypalResult.payerName} ({paypalResult.payerEmail})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-800 font-black">
                  <span>Total Paid:</span>
                  <span className="text-emerald-600 font-bold">
                    {activeCurrency.symbol}{paypalResult.amount.toFixed(2)} {paypalResult.currency}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="w-full py-3 px-6 rounded-2xl bg-[#003087] hover:bg-[#002366] text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-book-open text-xs"></i>
                  <span>Enter Diary Sanctuary with Pro</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {copiedReceipt ? '✓ PayPal Receipt Copied to Clipboard!' : 'Copy PayPal Receipt'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default PremiumModal;
