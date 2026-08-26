import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [inviteCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || params.get('invite') || localStorage.getItem('lumina_referred_by');
    } catch {
      return null;
    }
  });

  if (showPrivacyPolicy) {
    return <PrivacyPolicyPage onBack={() => setShowPrivacyPolicy(false)} />;
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Security Lock must be at least 6 characters long.');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please confirm your Security Lock.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        // Sign Up Flow
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
        onUnlock();
      } else {
        // Log In Flow
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onUnlock();
      }
    } catch (err: any) {
      console.error('Authentication result:', err);
      const code = err.code || '';
      
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Switch to Log In or try another email.');
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or Security Lock. Please check your credentials and try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Security Lock is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address above to receive a password reset link.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Could not send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 py-10 px-4 sm:px-6 relative overflow-y-auto font-sans">
      <div className="w-full max-w-md flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white w-full rounded-[32px] border border-slate-100/90 shadow-2xl overflow-hidden p-8 sm:p-10"
        >
          <div className="flex flex-col items-center text-center">
            {/* Sanctuary Icon Badge */}
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl mb-5 shadow-sm">
              <i className="fa-solid fa-user-shield text-indigo-500 animate-pulse"></i>
            </div>

            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
              {authMode === 'signup' ? 'Create Your Sanctuary' : 'Welcome Back'}
            </h1>

            {inviteCode && (
              <div className="mt-3 mb-1 px-3.5 py-2 bg-indigo-50 border border-indigo-100/80 rounded-2xl flex items-center gap-2 text-xs font-semibold text-indigo-800 animate-in fade-in slide-in-from-top-2 duration-300">
                <i className="fa-solid fa-gift text-indigo-600 text-sm shrink-0"></i>
                <span>You were invited to join Lumina by a friend!</span>
              </div>
            )}

            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 mb-6 leading-relaxed max-w-xs">
              {authMode === 'signup' 
                ? 'Sign up to start writing in your private, encrypted personal diary.' 
                : 'Log in to securely unlock your reflections and memories.'}
            </p>

            {/* Auth Mode Toggle Segment Control */}
            <div className="w-full bg-slate-100/80 p-1.5 rounded-2xl flex items-center mb-6 border border-slate-200/50">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className="fa-solid fa-user-plus text-[11px]"></i>
                <span>Sign Up</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className="fa-solid fa-right-to-bracket text-[11px]"></i>
                <span>Log In</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    autoComplete="email"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-700 text-sm outline-none transition-all placeholder:text-slate-300"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <i className="fa-solid fa-envelope text-sm"></i>
                  </span>
                </div>
              </div>

              {/* Security Lock (Password) Field */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {authMode === 'signup' ? 'Create Security Lock' : 'Security Lock (Password)'}
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Forgot Lock?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-700 text-sm outline-none transition-all placeholder:text-slate-300 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              {/* Confirm Security Lock (Only on Sign Up) */}
              {authMode === 'signup' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 text-left"
                >
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Confirm Security Lock
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter Security Lock"
                    autoComplete="new-password"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-700 text-sm outline-none transition-all placeholder:text-slate-300 font-mono"
                    required
                  />
                </motion.div>
              )}

              {/* Info / Success Message */}
              {infoMessage && (
                <motion.p 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-emerald-600 font-bold text-left pl-1 leading-relaxed bg-emerald-50 p-3 rounded-xl border border-emerald-100"
                >
                  <i className="fa-solid fa-circle-info mr-1.5 shrink-0"></i>
                  {infoMessage}
                </motion.p>
              )}

              {/* Error Message */}
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-500 font-bold text-left pl-1 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100"
                >
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 shrink-0"></i>
                  {error}
                </motion.p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-sm text-neutral-200"></i>
                    <span>{authMode === 'signup' ? 'Creating Sanctuary...' : 'Unlocking Diary...'}</span>
                  </>
                ) : (
                  <>
                    <i className={`fa-solid ${authMode === 'signup' ? 'fa-user-lock' : 'fa-lock-open'} text-sm text-neutral-200`}></i>
                    <span>{authMode === 'signup' ? 'Create Secure Account' : 'Log In to Sanctuary'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Switch Link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
              >
                {authMode === 'signup' ? (
                  <span>Already have an account? <strong className="text-indigo-600 font-bold underline">Log In</strong></span>
                ) : (
                  <span>Need a new sanctuary? <strong className="text-indigo-600 font-bold underline">Sign Up</strong></span>
                )}
              </button>
            </div>

            {/* Privacy & Security Guarantee Banner */}
            <div className="mt-6 pt-5 border-t border-slate-100/80 w-full flex flex-col items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-indigo-500 text-xs"></i>
                <span>Private & locally encrypted on your device</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="text-indigo-600 font-extrabold hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
              >
                <i className="fa-solid fa-shield-halved text-[11px]"></i>
                <span>Read Privacy Policy</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Clean Footer below the card */}
        <footer className="mt-6 text-center text-xs text-slate-400 font-medium">
          <span>© {new Date().getFullYear()} Lumina Diary • </span>
          <button
            type="button"
            onClick={() => setShowPrivacyPolicy(true)}
            className="text-slate-500 font-extrabold hover:text-indigo-600 hover:underline transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
        </footer>
      </div>
    </div>
  );
};
