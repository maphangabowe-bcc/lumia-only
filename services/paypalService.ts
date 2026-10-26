/**
 * PayPal Payment Gateway Integration Service
 * Loads the PayPal JavaScript SDK and handles Order Creation, Capture, and Verification.
 */

export interface PayPalConfig {
  clientId: string;
  currency: string;
  isSandbox: boolean;
  gateway: string;
}

export interface PayPalOrderCreationParams {
  amount: number;
  currency: string;
  billingType: 'manual' | 'auto';
  customerEmail?: string;
}

export interface PayPalCaptureParams {
  orderId: string;
  details?: any;
  billingType: 'manual' | 'auto';
  customerEmail?: string;
  amount: number;
  currency: string;
}

export interface PayPalCaptureResult {
  success: boolean;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  orderId: string;
  captureId: string;
  receiptNumber: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  currency: string;
  timestamp: string;
  message?: string;
}


class PayPalService {
  private scriptLoadingPromise: Promise<boolean> | null = null;
  private currentCurrency: string = 'USD';
  private cachedClientId: string = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || 'BAA8yU6hAYVDKoNo_F0j92gfpKlvcSXSLHK5GUB72kWj2FQNUVFNqnwn4NPcwn17acYemCFJ4Qvo1aiFng';

  /**
   * Fetches gateway configuration from backend
   */
  public async getConfig(): Promise<PayPalConfig> {
    try {
      const res = await fetch('/api/paypal/config');
      if (res.ok) {
        const data = await res.json();
        this.cachedClientId = data.clientId || this.cachedClientId;
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch PayPal config from backend, using live environment client ID:', e);
    }
    return {
      clientId: this.cachedClientId,
      currency: 'USD',
      isSandbox: false,
      gateway: 'PayPal Live Production Smart Buttons'
    };
  }

  /**
   * Loads or updates the PayPal JavaScript SDK dynamically
   */
  public async loadSdk(currency: string = 'USD'): Promise<boolean> {
    // If PayPal is already loaded with the same currency, return true
    if (window.paypal && this.currentCurrency === currency) {
      return true;
    }

    // Ensure we have the client ID
    if (!this.cachedClientId || this.cachedClientId === 'test') {
      await this.getConfig();
    }

    const clientId = this.cachedClientId || 'test';
    this.currentCurrency = currency;

    // Remove existing script if currency changed
    const existingScript = document.getElementById('paypal-sdk-script');
    if (existingScript) {
      existingScript.remove();
      window.paypal = undefined;
    }

    this.scriptLoadingPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = 'paypal-sdk-script';
      // Official PayPal JS SDK URL
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&components=buttons&enable-funding=venmo,paylater`;
      script.async = true;

      script.onload = () => {
        resolve(true);
      };

      script.onerror = (err) => {
        console.warn('Failed to load PayPal SDK from CDN:', err);
        resolve(false);
      };

      document.head.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  /**
   * Creates an order on the backend
   */
  public async createOrder(params: PayPalOrderCreationParams): Promise<{ id: string; orderId: string }> {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to initialize PayPal order.');
    }

    return await res.json();
  }

  /**
   * Captures and validates an approved order on the backend
   */
  public async captureOrder(params: PayPalCaptureParams): Promise<PayPalCaptureResult> {
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || data.status !== 'COMPLETED') {
      throw new Error(data.message || 'PayPal payment could not be captured or verified.');
    }

    return data;
  }

  /**
   * Verifies an order's status
   */
  public async verifyOrder(orderId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/paypal/verify/${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.success === true && data.status === 'COMPLETED';
      }
    } catch (e) {
      console.warn('Error verifying order with server', e);
    }
    return false;
  }
}

export const paypalService = new PayPalService();
export default paypalService;
