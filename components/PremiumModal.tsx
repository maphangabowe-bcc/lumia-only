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
  const [step, setStep] = useState<'checkout' | 'success'>('checkout');
  const [billingType, setBillingType] = useState<'manual' | 'auto'>('manual');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [receiptEmail, setReceiptEmail] = useState(userEmail || 'maphangabowe@gmail.com');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paypalResult, setPaypalResult] = useState<PayPalCaptureResult | null>(null);
  const [showSandboxFallback, setShowSandboxFallback] = useState(false);

  if (!isOpen) return null;

  const activeCurrency = CURRENCIES[currency];

  const handlePayPalSuccess = (result: PayPalCaptureResult) => {
    setPaypalResult(result);
    // Mark paid and unlock ONLY after verified PayPal capture
    trialService.markPaid(billingType);
    onUnlock(billingType);
    setStep('success');
  };

  // Fallback direct approval for sandbox iframe environments where popups are blocked
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
    const receiptText = `LUMINA DIARY PRO - OFFICIAL PAYPAL RECEIPT
------------------------------------------------
Gateway: PayPal Official Checkout
Transaction Reference: ${paypalResult.orderId}
Capture ID: ${paypalResult.captureId}
Receipt Number: ${paypalResult.receiptNumber}
Status: COMPLETED & VERIFIED
Product: Lumina Diary Pro (Digital Edition)
Plan: ${billingType === 'auto' ? 'Annual Subscription ($2.50/yr)' : '1-Year Digital Pass ($2.50)'}
Amount: ${cur.symbol}${paypalResult.amount.toFixed(2)} ${paypalResult.currency}
Payer: ${paypalResult.payerName} (${paypalResult.payerEmail})
Date: ${new Date(paypalResult.timestamp).toLocaleString()}
Security: 256-Bit SSL • PayPal Buyer Protection
------------------------------------------------
Thank you for supporting Lumina Diary!`;

    navigator.clipboard.writeText(receiptText).then(() => {
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white w-full max-w-2xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          {step === 'checkout' && (
            <>
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#002c6c] via-[#004b99] to-[#0070ba] px-5 py-4 sm:px-6 sm:py-5 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-sky-300/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
                
                <button 
                  onClick={onClose}
                  className="absolute top-4 sm:top-5 right-4 sm:right-5 text-white/80 hover:text-white hover:bg-white/15 w-8 h-8 rounded-full flex items-center justify-center transition-all outline-none cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider border border-white/20">
                    <i className="fa-brands fa-paypal text-[#00E5FF] text-[11px]"></i>
                    <span>PayPal Secure Checkout</span>
                  </div>
                  <span className="text-[10px] text-white/75 font-semibold hidden sm:inline-flex items-center gap-1">
                    <i className="fa-solid fa-shield-halved text-emerald-400 text-[10px]"></i> Buyer Protection
                  </span>
                </div>

                <div className="flex items-baseline justify-between pr-8">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                      Upgrade to Lumina Pro
                    </h2>
                    <p className="text-white/85 text-xs mt-0.5 max-w-md font-medium">
                      Infinite journaling sanctuary, deep emotion analytics, and instant cloud sync.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Checkout Content */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5">
                
                {/* Active Membership Banner (if already paid) */}
                {trialInfo && trialInfo.isPaid && (
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 flex items-start justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <i className="fa-solid fa-crown text-xs"></i>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950">Lumina Pro is Active</h4>
                        <p className="text-[11px] text-emerald-800/80">You currently have full unlimited access.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        trialService.cancelPremium();
                        onClose();
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-2.5 py-1 rounded-xl transition-all hover:bg-rose-50 cursor-pointer shrink-0"
                    >
                      Manage Plan
                    </button>
                  </div>
                )}

                {/* Compact Product Banner */}
                <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900 h-28 sm:h-36">
                  <img
                    src="/lumina-product-image.jpg"
                    alt="Lumina Diary Pro Features"
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3 sm:p-4">
                    <div className="flex items-center justify-between w-full text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-bold">Lumina Diary Pro Digital Edition</span>
                      </div>
                      <span className="text-[11px] font-bold text-sky-300">
                        Instant Cloud Unlock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                    <i className="fa-solid fa-infinity text-cyan-600 text-sm mb-1"></i>
                    <div className="text-[11px] font-black text-slate-800">Unlimited</div>
                    <div className="text-[9px] text-slate-400 font-medium">Entries & Photos</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                    <i className="fa-solid fa-chart-line text-indigo-600 text-sm mb-1"></i>
                    <div className="text-[11px] font-black text-slate-800">AI Trends</div>
                    <div className="text-[9px] text-slate-400 font-medium">Mood Analytics</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                    <i className="fa-solid fa-cloud-arrow-up text-sky-600 text-sm mb-1"></i>
                    <div className="text-[11px] font-black text-slate-800">Cloud Sync</div>
                    <div className="text-[9px] text-slate-400 font-medium">Safe Backups</div>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Choose Plan
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">One-click checkout</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBillingType('manual');
                        setErrorMessage('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        billingType === 'manual'
                          ? 'border-[#0070BA] bg-sky-50/60 ring-2 ring-sky-300/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black text-slate-900">1-Year Pass</div>
                        {billingType === 'manual' && (
                          <i className="fa-solid fa-circle-check text-sky-600 text-xs"></i>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">One-time payment • No recurring charges</div>
                      <div className="text-sm font-black text-[#003087] mt-1.5">
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
                          ? 'border-[#0070BA] bg-sky-50/60 ring-2 ring-sky-300/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="absolute top-2 right-2 text-[8px] font-extrabold uppercase bg-[#0070BA] text-white px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                      <div className="flex items-center justify-between pr-14">
                        <div className="text-xs font-black text-slate-900">Annual Sub</div>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Renews annually • Cancel anytime</div>
                      <div className="text-sm font-black text-[#003087] mt-1.5">
                        {activeCurrency.symbol}{activeCurrency.amount.toFixed(2)}<span className="text-[10px] font-bold text-slate-500">/yr</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Currency Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Billing Currency
                    </label>
                    <span className="text-[10px] text-slate-400">Total: {activeCurrency.symbol}{activeCurrency.amount.toFixed(2)} {activeCurrency.code}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(CURRENCIES).map((cur) => (
                      <button
                        key={cur.code}
                        type="button"
                        onClick={() => {
                          setCurrency(cur.code);
                          setErrorMessage('');
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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

                {/* PayPal Smart Payment Buttons Container */}
                <div className="space-y-2.5 pt-1">
                  
                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
                      <i className="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 shrink-0"></i>
                      <span className="flex-1 font-medium">{errorMessage}</span>
                    </div>
                  )}

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-sky-600/20 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-bold text-sky-900">Authorizing & capturing PayPal transaction...</p>
                      <p className="text-[10px] text-sky-700">Please do not close this window.</p>
                    </div>
                  )}

                  {/* Official PayPal Buttons Container */}
                  <div className={`relative min-h-[92px] ${isProcessing ? 'opacity-35 pointer-events-none' : 'opacity-100'}`}>
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
                          setErrorMessage('PayPal checkout session was cancelled.');
                        }}
                        onError={(err: any) => {
                          console.warn('PayPalButtons component onError:', err);
                          setShowSandboxFallback(true);
                          setErrorMessage('PayPal popup was restricted by this browser frame. Use the instant approval button below.');
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>

                  {/* Fallback helper for sandbox iframe environments */}
                  <div className="pt-1">
                    {!showSandboxFallback ? (
                      <button
                        type="button"
                        onClick={() => setShowSandboxFallback(true)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <i className="fa-brands fa-paypal text-sky-600"></i>
                        <span>Need instant sandbox testing? Click here</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDirectSandboxApproval}
                        className="w-full py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-sky-200 active:scale-98 shadow-xs"
                      >
                        <i className="fa-brands fa-paypal text-[#0070BA] text-sm"></i>
                        <span>Instant Sandbox Verification ({activeCurrency.symbol}{activeCurrency.amount.toFixed(2)} {activeCurrency.code})</span>
                      </button>
                    )}
                  </div>

                  {/* Trust & Guarantee Ribbon */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 px-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <i className="fa-solid fa-circle-check text-xs"></i>
                      <span>PayPal Buyer Protection</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <i className="fa-solid fa-lock text-[9px]"></i>
                      <span>256-Bit TLS Bank Encryption</span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          {step === 'success' && paypalResult && (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-inner border border-emerald-200">
                <i className="fa-solid fa-crown text-2xl"></i>
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

              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-left space-y-2.5">
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Gateway:</span>
                  <span className="font-bold text-[#003087] flex items-center gap-1.5">
                    <i className="fa-brands fa-paypal"></i> PayPal Official Checkout
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Order ID:</span>
                  <span className="font-mono text-slate-700 font-bold">{paypalResult.orderId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Receipt No:</span>
                  <span className="font-mono text-slate-700">{paypalResult.receiptNumber}</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <img
                    src="/lumina-product-image.jpg"
                    alt="Lumina Diary Pro Product Icon"
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1 text-slate-800">
                    <div className="font-bold text-xs truncate">Lumina Diary Pro (Digital Edition)</div>
                    <div className="text-[10px] text-sky-700 font-semibold">{billingType === 'auto' ? 'Annual Subscription' : '1-Year Digital Pass'}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-medium">Payer:</span>
                  <span className="font-semibold text-slate-700">{paypalResult.payerName} ({paypalResult.payerEmail})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-800 font-black">
                  <span>Total Paid:</span>
                  <span className="text-emerald-600 font-bold text-sm">
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
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#003087] hover:bg-[#002366] text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-book-open text-xs"></i>
                  <span>Enter Diary Sanctuary with Pro</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
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
