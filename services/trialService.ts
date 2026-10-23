/**
 * Lumina Pro Membership & Access Control Service
 * Strict Access Policy:
 * Only users who decide to keep Lumina Pro and have completed a verified
 * payment transaction receive access to all premium features.
 */

export interface TrialInfo {
  isPaid: boolean;
  hasPremiumAccess: boolean;
  isCancelled: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  startDate?: Date;
  expiresDate?: Date;
  progressPercent: number;
  billingType?: 'manual' | 'auto';
}

const STORAGE_KEY_PREMIUM = 'lumina_diary_premium';
const STORAGE_KEY_CANCELLED = 'lumina_premium_cancelled';
const STORAGE_KEY_BILLING_TYPE = 'lumina_premium_billing_type';
const STORAGE_KEY_UNLOCKED_AT = 'lumina_premium_unlocked_at';
const STORAGE_KEY_CANCELLED_AT = 'lumina_premium_cancelled_at';

type TrialListener = (info: TrialInfo) => void;

class TrialService {
  private listeners: Set<TrialListener> = new Set();

  /**
   * Calculates current Pro access status.
   * Strict Rule: Only verified paying users get access to premium features.
   */
  public getTrialInfo(): TrialInfo {
    if (typeof window === 'undefined') {
      return {
        isPaid: false,
        hasPremiumAccess: false,
        isCancelled: false,
        isTrialActive: false,
        isTrialExpired: true,
        daysRemaining: 0,
        progressPercent: 0,
      };
    }

    const isPaid = localStorage.getItem(STORAGE_KEY_PREMIUM) === 'true';
    const isCancelled = localStorage.getItem(STORAGE_KEY_CANCELLED) === 'true';
    const billingType = (localStorage.getItem(STORAGE_KEY_BILLING_TYPE) as 'manual' | 'auto') || undefined;

    // Strict access: Only users with verified completed payment who have not cancelled have access
    const hasPremiumAccess = isPaid && !isCancelled;

    return {
      isPaid,
      hasPremiumAccess,
      isCancelled,
      isTrialActive: false, // Strict: no free unverified premium trial
      isTrialExpired: !hasPremiumAccess,
      daysRemaining: 0,
      progressPercent: hasPremiumAccess ? 100 : 0,
      billingType,
    };
  }

  /**
   * Unlocks all premium features permanently after a verified successful transaction
   */
  public markPaid(billingType: 'manual' | 'auto' = 'manual'): TrialInfo {
    try {
      localStorage.setItem(STORAGE_KEY_PREMIUM, 'true');
      localStorage.removeItem(STORAGE_KEY_CANCELLED);
      localStorage.removeItem(STORAGE_KEY_CANCELLED_AT);
      localStorage.setItem(STORAGE_KEY_BILLING_TYPE, billingType);
      localStorage.setItem(STORAGE_KEY_UNLOCKED_AT, new Date().toISOString());
    } catch (e) {
      console.warn('Error saving premium status', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Cancels Lumina Pro membership and immediately locks all premium features
   */
  public cancelPremium(): TrialInfo {
    try {
      localStorage.removeItem(STORAGE_KEY_PREMIUM);
      localStorage.setItem(STORAGE_KEY_CANCELLED, 'true');
      localStorage.setItem(STORAGE_KEY_CANCELLED_AT, new Date().toISOString());
    } catch (e) {
      console.warn('Error saving premium cancellation', e);
    }
    const info = this.getTrialInfo();
    this.notify(info);
    return info;
  }

  /**
   * Subscribes to premium state changes
   */
  public subscribe(listener: TrialListener): () => void {
    this.listeners.add(listener);
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
        console.error('Error notifying premium subscriber', err);
      }
    });
  }
}

export const trialService = new TrialService();
export default trialService;
