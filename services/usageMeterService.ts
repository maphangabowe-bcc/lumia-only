/**
 * Dodo Payments Usage Meter Service
 * Tracks customer usage (API calls, AI queries, messages sent) and syncs usage metrics
 * with Dodo Payments metered billing for automated billing cycle charging.
 */

export interface UsageMeterData {
  apiCalls: number;
  aiQueries: number;
  messagesSent: number;
  billingCycleStart: string;
  nextBillingDate: string;
  unitPrice: number; // e.g. $0.05 per unit above free allowance
  freeAllowance: number;
  estimatedCharge: number;
  currency: string;
}

class UsageMeterService {
  private STORAGE_KEY = 'lumina_dodo_usage_meters';

  constructor() {
    this.ensureInitialized();
  }

  public ensureInitialized(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const initial: UsageMeterData = {
          apiCalls: 12,
          aiQueries: 5,
          messagesSent: 8,
          billingCycleStart: now.toISOString(),
          nextBillingDate: nextMonth.toISOString(),
          unitPrice: 0.05,
          freeAllowance: 50,
          estimatedCharge: 0.00,
          currency: 'USD'
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.warn('Could not initialize usage meter storage', e);
    }
  }

  public getUsage(): UsageMeterData {
    if (typeof window === 'undefined') {
      return {
        apiCalls: 0,
        aiQueries: 0,
        messagesSent: 0,
        billingCycleStart: new Date().toISOString(),
        nextBillingDate: new Date().toISOString(),
        unitPrice: 0.05,
        freeAllowance: 50,
        estimatedCharge: 0.00,
        currency: 'USD'
      };
    }
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed: UsageMeterData = JSON.parse(data);
        const billableUnits = Math.max(0, (parsed.apiCalls + parsed.aiQueries + parsed.messagesSent) - parsed.freeAllowance);
        parsed.estimatedCharge = Number((billableUnits * parsed.unitPrice).toFixed(2));
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read usage meter data', e);
    }
    return {
      apiCalls: 12,
      aiQueries: 5,
      messagesSent: 8,
      billingCycleStart: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      unitPrice: 0.05,
      freeAllowance: 50,
      estimatedCharge: 0.00,
      currency: 'USD'
    };
  }

  public trackUsage(type: 'api_call' | 'ai_query' | 'message', count = 1): UsageMeterData {
    const usage = this.getUsage();
    if (type === 'api_call') usage.apiCalls += count;
    if (type === 'ai_query') usage.aiQueries += count;
    if (type === 'message') usage.messagesSent += count;

    const totalUsage = usage.apiCalls + usage.aiQueries + usage.messagesSent;
    const billableUnits = Math.max(0, totalUsage - usage.freeAllowance);
    usage.estimatedCharge = Number((billableUnits * usage.unitPrice).toFixed(2));

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
      // Asynchronously report usage to backend Dodo metered endpoint
      this.syncWithServer(usage);
    } catch (e) {
      console.warn('Could not save usage meter data', e);
    }
    return usage;
  }

  private async syncWithServer(usage: UsageMeterData) {
    try {
      await fetch('/api/dodo/usage/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: localStorage.getItem('lumina_dodo_customer_id') || 'cust_lumina_' + Date.now(),
          usage
        })
      });
    } catch (err) {
      // Background sync fail is non-blocking
    }
  }

  public resetUsage(): UsageMeterData {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const fresh: UsageMeterData = {
      apiCalls: 0,
      aiQueries: 0,
      messagesSent: 0,
      billingCycleStart: now.toISOString(),
      nextBillingDate: nextMonth.toISOString(),
      unitPrice: 0.05,
      freeAllowance: 50,
      estimatedCharge: 0.00,
      currency: 'USD'
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {
      // ignore
    }
    return fresh;
  }
}

export const usageMeterService = new UsageMeterService();
