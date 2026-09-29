import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { networkManager, NetworkStatus } from '../services/networkService';
import { trialService, TrialInfo } from '../services/trialService';

interface PrivacySettingsModalProps {
  onClose: () => void;
  onLock: () => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  defaultTab?: 'security' | 'policy' | 'network';
  onNavigate?: (path: string) => void;
  isPremium?: boolean;
  trialInfo?: TrialInfo;
  onOpenPremium?: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  onClose,
  onLock,
  triggerToast,
  defaultTab = 'security',
  onNavigate,
  isPremium = false,
  trialInfo,
  onOpenPremium
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'policy' | 'network'>(defaultTab);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkManager.getStatus());

  useEffect(() => {
    const unsub = networkManager.subscribe((status) => {
      setNetworkStatus(status);
    });
    return () => unsub();
  }, []);

  const handleToggleDataSaver = () => {
    const nextState = !networkStatus.isDataSaver;
    networkManager.setDataSaverMode(nextState);
    triggerToast(
      nextState 
        ? '⚡ Data Saver enabled! Low-bandwidth optimizations active.' 
        : 'Data Saver disabled. Standard media quality active.',
      'info'
    );
  };

  const savedBillingType = (localStorage.getItem('lumina_premium_billing_type') as 'manual' | 'auto') || 'manual';
  const [currentBillingType, setCurrentBillingType] = useState<'manual' | 'auto'>(savedBillingType);

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Lumina Diary</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-50 text-slate-600 min-h-screen flex flex-col antialiased">
  <header class="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
    <div class="max-w-4xl mx-auto flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
          <i class="fa-solid fa-book-open text-white text-xs"></i>
        </div>
        <div>
          <h1 class="text-sm font-black text-slate-800 leading-none">Lumina Diary</h1>
          <p class="text-[9px] text-slate-400 mt-0.5 font-bold tracking-wider uppercase">Private Sanctuary</p>
        </div>
      </div>
      <div class="text-xs text-slate-400 font-medium">Official Document</div>
    </div>
  </header>
  <main class="flex-1 max-w-3xl mx-auto w-full px-5 py-12">
    <div class="bg-white rounded-[32px] border border-slate-100 shadow-xl p-8 md:p-12 space-y-10">
      <div class="text-center space-y-4">
        <div class="w-16 h-16 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl mx-auto">
          <i class="fa-solid fa-user-shield text-indigo-500"></i>
        </div>
        <div class="space-y-1.5">
          <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Privacy Policy</h2>
          <p class="text-slate-400 text-xs md:text-sm">Our strict, uncompromised commitment to your personal safety and data confidentiality.</p>
        </div>
      </div>
      <hr class="border-slate-100" />
      <div class="bg-indigo-50/60 rounded-3xl p-6 border border-indigo-100/40 flex items-start gap-4">
        <div class="w-10 h-10 bg-white border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
          <i class="fa-solid fa-hands-holding-heart"></i>
        </div>
        <div class="space-y-1.5 text-xs">
          <h3 class="font-extrabold text-slate-800">Your Privacy is Absolute</h3>
          <p class="text-slate-500 leading-relaxed">
            Lumina Diary is designed from the ground up as a private sanctuary. We do not track, profile, monetize, or harvest your personal reflections.
          </p>
        </div>
      </div>
      <div class="space-y-8 text-slate-600 text-xs leading-relaxed">
        <div class="space-y-2">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">1. Local Offline Sovereignty</h3>
          <p class="text-slate-500">Your diary entries reside strictly in your device's browser space (Local Storage) or your authenticated Cloud Profile. We have no access to browse or search your records.</p>
        </div>
        <div class="space-y-2">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">2. Secure AI Features</h3>
          <p class="text-slate-500">To preserve utmost security, AI features analyze entries safely on the server side without retaining user records. Only mood metadata or manual polish requests are routed to the API.</p>
        </div>
        <div class="space-y-2">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">3. Backup Custody</h3>
          <p class="text-slate-500">Data exports (backups) are generated as secure, readable JSON files locally on your computer. You hold complete custody over where these files are stored.</p>
        </div>
        <div class="space-y-2">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">4. Right to Deletion and Full Application Reset</h3>
          <p class="text-slate-500">You possess absolute ownership over your data. Inside the Privacy settings of your diary, you can execute a full Application Reset with a single click. This action instantly wipes all local databases, cached images, and access passwords from your browser space forever, executing your complete right to erasure securely.</p>
        </div>
      </div>
    </div>
  </main>
  <footer class="py-8 text-center text-slate-400 text-xs border-t border-slate-100 bg-white">
    <p>© 2026 Lumina Diary. Your memories remain completely your own.</p>
  </footer>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'privacy-policy.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('Privacy Policy HTML downloaded! Simply upload this file to your hosting dashboard.', 'success');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Security Lock must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        triggerToast('Security Lock updated successfully in your cloud account!', 'success');
        onClose();
      } else {
        // Fallback for local
        localStorage.setItem('lumina_diary_password', newPassword);
        triggerToast('Local Security Lock updated successfully!', 'success');
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in to change your Security Lock.');
      } else {
        setError(err.message || 'Failed to update Security Lock.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in duration-300"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100/50 text-indigo-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-user-shield text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 leading-none">Privacy & Security</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Protect and understand your diary space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center animate-in fade-in"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/20 px-3 md:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-key text-[10px]"></i>
            Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'network'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-bolt text-[10px]"></i>
            Data Saver
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'policy'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-file-invoice text-[10px]"></i>
            Policy
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
                  Change Password
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                      New Security Lock
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                      Confirm New Lock
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new lock"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] text-rose-500 font-semibold pl-1">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-key'} text-[10px]`}></i>
                  {loading ? 'Updating...' : 'Update Security Lock'}
                </button>
              </form>

              {/* Membership & Subscription Status */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <i className={`fa-solid ${trialInfo?.isPaid ? 'fa-crown text-amber-500' : (trialInfo?.isTrialActive ? 'fa-gift text-indigo-600' : 'fa-hourglass-end text-rose-500')}`}></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        {trialInfo?.isPaid 
                          ? 'Lumina Premium Active' 
                          : (trialInfo?.isCancelled
                              ? 'Premium Membership Cancelled'
                              : (trialInfo?.isTrialActive 
                                  ? 'Free Trial Active' 
                                  : 'Free Trial Ended'))}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                        {trialInfo?.isPaid 
                          ? (currentBillingType === 'auto' ? 'Auto-Billing Subscription ($2.50/yr)' : 'Permanent License Pass ($2.50)')
                          : (trialInfo?.isCancelled
                              ? 'Subscription cancelled. Premium features are locked until you upgrade.'
                              : (trialInfo?.isTrialActive 
                                  ? 'Full access to all premium features enabled' 
                                  : 'Trial concluded. Upgrade to restore premium features.'))}
                      </p>
                    </div>
                  </div>
                  {trialInfo?.isPaid ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase shrink-0">
                      Paid Pro
                    </span>
                  ) : trialInfo?.isCancelled ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full uppercase shrink-0">
                      Cancelled
                    </span>
                  ) : trialInfo?.isTrialActive ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase shrink-0">
                      Trial Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full uppercase shrink-0">
                      Expired
                    </span>
                  )}
                </div>

                {/* Upgrade prompt if not paid */}
                {!trialInfo?.isPaid && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {trialInfo?.isTrialActive 
                        ? 'Want to keep premium permanently? Lock it in anytime.' 
                        : 'Upgrade now to restore unlimited pages, AI insights, and backups.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenPremium) onOpenPremium();
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                        <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                        <rect x="3" y="17" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                      </svg>
                      <span>{trialInfo?.isTrialActive ? 'Keep Premium $2.50' : 'Upgrade Now $2.50'}</span>
                    </button>
                  </div>
                )}

                {/* Testing & Verification Controls for Trial Simulation */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Trial Testing:</span>
                  <div className="flex items-center gap-2">
                    {trialInfo?.isTrialActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          trialService.simulateExpired();
                          triggerToast('Simulated trial expiration. Premium features locked.', 'info');
                        }}
                        className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                        title="Simulate what happens when the free trial period expires"
                      >
                        Simulate Expired Trial
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          trialService.resetTrial();
                          triggerToast('Free trial restored. All premium features unlocked!', 'success');
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-bold underline cursor-pointer"
                        title="Reset free trial to active"
                      >
                        Reset Free Trial
                      </button>
                    )}
                  </div>
                </div>

                {trialInfo?.isPaid && (
                  <div className="pt-2.5 border-t border-slate-200/60 space-y-2">
                    {localStorage.getItem('lumina_premium_license_key') && (
                      <div className="flex items-center justify-between text-[10px] bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/60 font-mono">
                        <span className="text-slate-500 font-sans font-medium flex items-center gap-1">
                          <i className="fa-solid fa-key text-[9px] text-amber-500"></i>
                          License:
                        </span>
                        <span className="text-indigo-600 font-bold tracking-wider">{localStorage.getItem('lumina_premium_license_key')}</span>
                      </div>
                    )}
                    {localStorage.getItem('lumina_paystack_ref') && (
                      <div className="flex items-center justify-between text-[10px] bg-white px-2.5 py-1 rounded-xl border border-slate-200/60 font-mono">
                        <span className="text-slate-500 font-sans font-medium flex items-center gap-1">
                          <i className="fa-solid fa-receipt text-[9px] text-cyan-600"></i>
                          Paystack Ref:
                        </span>
                        <span className="text-slate-700 font-bold truncate max-w-[150px]">{localStorage.getItem('lumina_paystack_ref')}</span>
                      </div>
                    )}
                    {/* Billing Preference Selector (Auto-Billed Each Year vs Pay Manually) */}
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">
                          Billing Preference:
                        </span>
                        <span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                          {currentBillingType === 'auto' ? 'Auto-Billed Each Year' : 'Pay Manually'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentBillingType('auto');
                            localStorage.setItem('lumina_premium_billing_type', 'auto');
                            triggerToast('Switched to Auto-Billing ($2.50/year auto-renew).', 'info');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            currentBillingType === 'auto'
                              ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-800">Auto-Billed Yearly</span>
                            {currentBillingType === 'auto' && (
                              <i className="fa-solid fa-check text-[9px] text-cyan-600" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 leading-tight mt-0.5">
                            $2.50 auto-renews annually.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentBillingType('manual');
                            localStorage.setItem('lumina_premium_billing_type', 'manual');
                            triggerToast('Switched to Manual Renewal (no recurring auto-charges).', 'info');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            currentBillingType === 'manual'
                              ? 'border-cyan-600 bg-cyan-50/50 ring-1 ring-cyan-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-800">Pay Manually</span>
                            {currentBillingType === 'manual' && (
                              <i className="fa-solid fa-check text-[9px] text-cyan-600" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 leading-tight mt-0.5">
                            One-time pay. Never auto-charged.
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Easy Subscription Cancellation */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Subscription Status:</span>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <i className="fa-solid fa-ban text-[9px]"></i>
                        <span>Cancel Subscription</span>
                      </button>
                    </div>

                    {showCancelConfirm && (
                      <div className="mt-2.5 p-3.5 bg-rose-50/90 border border-rose-200/90 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-rose-950">Cancel Lumina Premium?</h5>
                            <p className="text-[10px] text-rose-800/90 mt-0.5 leading-relaxed">
                              Cancelling will immediately lock all premium features (unlimited entries beyond 30, AI weekly reflections, morning intent alerts, and cloud backup). All your existing saved entries remain 100% safe.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              trialService.cancelPremium();
                              setShowCancelConfirm(false);
                              triggerToast('Lumina Premium cancelled. Premium features are now locked.', 'info');
                            }}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            Confirm Cancellation
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Keep Premium
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Quick Lock & Erase Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
                  Actions
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onLock}
                    className="flex flex-col items-center justify-center p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-2xl transition-all active:scale-95 group text-center"
                  >
                    <i className="fa-solid fa-lock text-xl mb-2 text-indigo-500 group-hover:scale-110 transition-transform"></i>
                    <span className="text-xs font-black">Lock Diary</span>
                    <span className="text-[9px] text-indigo-500 mt-1 font-medium leading-tight">Secures contents immediately</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm("Warning: Resetting your security locks will completely delete all locally saved entries to guarantee complete data confidentiality. Proceed?");
                      if (confirmed) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-[24px] transition-all active:scale-95 group text-center"
                  >
                    <i className="fa-solid fa-trash-can text-xl mb-2 text-rose-500 group-hover:scale-110 transition-transform"></i>
                    <span className="text-xs font-black">App Reset</span>
                    <span className="text-[9px] text-rose-500 mt-1 font-medium leading-tight">Wipes everything securely</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Connection Quality Card */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                      !networkStatus.isOnline 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : networkStatus.isSlowConnection 
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      <i className={`fa-solid ${
                        !networkStatus.isOnline 
                          ? 'fa-plug-circle-xmark' 
                          : networkStatus.isSlowConnection 
                          ? 'fa-triangle-exclamation' 
                          : 'fa-wifi'
                      }`}></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        {!networkStatus.isOnline 
                          ? 'Offline Mode' 
                          : networkStatus.isSlowConnection 
                          ? 'Slow / Constrained Network' 
                          : 'High-Speed Connection'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {!networkStatus.isOnline 
                          ? 'Zero data used • All features safe locally'
                          : `Type: ${networkStatus.effectiveType.toUpperCase()} • Ping: ~${networkStatus.rtt}ms`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase ${
                    !networkStatus.isOnline 
                      ? 'bg-rose-100 text-rose-700' 
                      : networkStatus.isSlowConnection 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {!networkStatus.isOnline ? 'Offline' : networkStatus.isSlowConnection ? 'Slow' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Network Bandwidth</span>
                    <strong className="text-slate-700 text-xs">{networkStatus.downlink} Mbps</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Local Sync Queue</span>
                    <strong className="text-slate-700 text-xs">Instant / 0ms</strong>
                  </div>
                </div>
              </div>

              {/* Data Saver Mode Toggle */}
              <div className="p-5 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-bolt text-amber-500 text-xs"></i>
                      <h4 className="text-xs font-black text-slate-800">Data Saver Mode</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Optimizes images and uses rapid local AI fallbacks to load instantly on 2G, 3G, and metered mobile networks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleDataSaver}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 cursor-pointer ${
                      networkStatus.isDataSaver ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        networkStatus.isDataSaver ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="text-[10px] text-indigo-700/80 bg-white/70 p-2.5 rounded-xl border border-indigo-100/50 flex items-start gap-2">
                  <i className="fa-solid fa-shield-halved text-indigo-500 mt-0.5"></i>
                  <span>Your diary entries always save immediately to local device memory first — zero waiting or frozen screens!</span>
                </div>
              </div>

              {/* Offline Reliability Checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
                  Slow Internet Protections
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                    <span className="text-[11px] font-medium">Automatic client-side photo compression (~80KB)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                    <span className="text-[11px] font-medium">Instant offline caching via Service Worker v2</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                    <span className="text-[11px] font-medium">Adaptive 2.8s API timeouts with offline inspiration generator</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'policy' && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 text-slate-600 pb-2"
            >
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100/40 text-center space-y-4">
                <div className="w-12 h-12 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-xl mx-auto shadow-sm">
                  <i className="fa-solid fa-user-shield"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800">Separate Privacy Window</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    To guarantee completely untracked, high-security reading, our official Privacy Policy can be opened in a clean, separate URL window.
                  </p>
                </div>
                
                <div className="space-y-2.5">
                  <a
                    href="http://luminadiary.unaux.com/privacy%20policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-md shadow-indigo-100/50 active:scale-95 transition-all w-full cursor-pointer"
                  >
                    <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                    Open Official Privacy Policy
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-database text-indigo-500 text-[10px]"></i> Local Offline Storage
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-4.5">
                    Your journal entries and custom lock configurations reside strictly in your device's browser space.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-robot text-indigo-500 text-[10px]"></i> Secure AI Privacy Proxies
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-4.5">
                    To preserve utmost security, AI features are built on custom privacy proxies.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono font-medium">
                <span>Last Updated: July 2026</span>
                <span>Active Shield Protected</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
