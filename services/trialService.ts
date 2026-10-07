/**
 * 60-Day Premium Trial Management Service
 * Grants all new users full access to all premium features for 60 days.
 * After 60 days, users must upgrade via Dodo Payments ($2.50) to keep premium features.
 */

export interface TrialInfo {
  isPaid: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasPremiumAccess: boolean;
  isCancelled: boolean;
  daysRemaining: number;
  startDate: Date;
  expiresDate: Date;
  progressPercent: number;
}

const TRIAL_DURATION_DAYS = 60;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
const STORAGE_KEY_TRIAL_START = 'lumina_trial_started_at';
const STORAGE_KEY_PREMIUM = 'lumina_diary_premium';
const STORAGE_KEY_CANCELLED = 'lumina_premium_cancelled';

type TrialListener = (info: TrialInfo) => void;

class TrialService {
  private listeners: Set<TrialListener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Ensures the trial start timestamp exists in localStorage
   */
  public ensureInitialized(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TRIAL_START);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_TRIAL_START, new Date().toISOString());
      }
    } catch (e) {
      console.warn('Unable to access localStorage for trial initialization', e);
    }
  }

  /**
   * Calculates current trial and premium status
   */
  public getTrialInfo(): TrialInfo {
    if (typeof window === 'undefined') {
      const now = new Date();
      return {
        isPaid: false,
        isTrialActive: true,
        isTrialExpired: false,
        hasPremiumAccess: true,
        isCancelled: false,
        daysRemaining: TRIAL_DURATION_DAYS,
        startDate: now,
        expiresDate: new Date(now.getTime() + TRIAL_DURATION_MS),
        progressPercent: 0,
      };
    }

    const isPaid = localStorage.getItem(STORAGE_KEY_PREMIUM) === 'true';
    const isCancelled = localStorage.getItem(STORAGE_KEY_CANCELLED) === 'true';

    let storedStart = localStorage.getItem(STORAGE_KEY_TRIAL_START);
    if (!storedStart) {
      storedStart = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY_TRIAL_START, storedStart);
      } catch (e) {
        // fallback
      }
    }

    const startDate = new Date(storedStart);
    const now = new Date();
    const expiresDate = new Date(startDate.getTime() + TRIAL_DURATION_MS);
    
    const msRemaining = expiresDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // If cancelled and not paid, access is strictly disabled
    const isTrialExpired = !isPaid && (isCancelled || msRemaining <= 0);
    const isTrialActive = !isPaid && !isCancelled && msRemaining > 0;
    const hasPremiumAccess = isPaid || isTrialActive;

    const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / TRIAL_DURATION_MS) * 100)));

    return {
      isPaid,
      isTrialActive,
      isTrialExpired,
      hasPremiumAccess,
      isCancelled,
      daysRemaining,
      startDate,
      expiresDate,
      progressPercent,
    };
  }

  /**
   * Marks premium as unlocked permanently (upon Dodo Payments payment)
   */
  public markPaid(billingType: 'manual' | 'auto' = 'manual'): TrialInfo {
    try {
      localStorage.setItem(STORAGE_KEY_PREMIUM, 'true');
      localStorage.removeItem(STORAGE_KEY_CANCELLED);
      localStorage.removeItem('lumina_premium_cancelled_at');
      localStorage.setItem('lumina_premium_billing_type', billingType);
      localStorage.setItem('lumina_premium_unlocked_at', new Date().toISOString());
    } catch (e) {
      console.warn('Error saving premium status', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Cancels premium membership immediately and locks all premium features
   */
  public cancelPremium(): TrialInfo {
    try {
      localStorage.removeItem(STORAGE_KEY_PREMIUM);
      localStorage.setItem(STORAGE_KEY_CANCELLED, 'true');
      localStorage.setItem('lumina_premium_cancelled_at', new Date().toISOString());
      // Expire trial timestamp so user cannot bypass cancellation
      const expiredStart = new Date(Date.now() - (TRIAL_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY_TRIAL_START, expiredStart.toISOString());
    } catch (e) {
      console.warn('Error saving premium cancellation', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Simulates an expired trial (for testing and verification)
   */
  public simulateExpired(): TrialInfo {
    try {
      // Remove paid flag if set
      localStorage.removeItem(STORAGE_KEY_PREMIUM);
      // Set trial start to 61 days ago
      const expiredStart = new Date(Date.now() - (TRIAL_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY_TRIAL_START, expiredStart.toISOString());
    } catch (e) {
      console.warn('Error setting simulated expired trial', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Resets the 60-day trial to today
   */
  public resetTrial(): TrialInfo {
    try {
      localStorage.removeItem(STORAGE_KEY_CANCELLED);
      localStorage.setItem(STORAGE_KEY_TRIAL_START, new Date().toISOString());
    } catch (e) {
      console.warn('Error resetting trial', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Subscribes to trial/premium state changes
   */
  public subscribe(listener: TrialListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener(this.getTrialInfo());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(info: TrialInfo) {
    this.listeners.forEach((cb) => {
      try {
        cb(info);
      } catch (err) {
        console.error('Error notifying trial subscriber', err);
      }
    });
  }
}

export const trialService = new TrialService();
