import { supabase } from '../lib/supabaseClient';

export interface StripeConnectAccount {
  id: string;
  object: string;
  business_type: string;
  country: string;
  default_currency: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  email?: string;
  created: number;
}

export interface StripeTransfer {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  transfer_group?: string;
  metadata?: Record<string, string>;
}

export interface PayoutData {
  hostId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  description?: string;
}

export class StripeConnectService {
  // Create Stripe Connect account link
  static async createAccountLink(hostId: string, refreshUrl: string, returnUrl: string): Promise<{ url: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-create-account-link', {
        body: {
          hostId,
          refreshUrl,
          returnUrl
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating Stripe Connect account link:', error);
      throw error;
    }
  }

  // Get Stripe Connect account status
  static async getAccountStatus(hostId: string): Promise<StripeConnectAccount> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-get-account', {
        body: { hostId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting Stripe Connect account status:', error);
      throw error;
    }
  }

  // Create payout to host
  static async createPayout(payoutData: PayoutData): Promise<StripeTransfer> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-create-payout', {
        body: payoutData
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  // Get payout history
  static async getPayoutHistory(hostId: string, limit = 10): Promise<StripeTransfer[]> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-get-payouts', {
        body: { hostId, limit }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }

  // Check if host has valid Stripe Connect account
  static async isStripeConnectEnabled(hostId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connect_enabled, stripe_connect_account_id')
        .eq('id', hostId)
        .single();

      if (error) throw error;
      return data?.stripe_connect_enabled && !!data?.stripe_connect_account_id;
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      return false;
    }
  }

  // Enable Stripe Connect for host
  static async enableStripeConnect(hostId: string, accountId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_connect_enabled: true,
          stripe_connect_account_id: accountId
        })
        .eq('id', hostId);

      if (error) throw error;
    } catch (error) {
      console.error('Error enabling Stripe Connect:', error);
      throw error;
    }
  }

  // Process scheduled payouts
  static async processScheduledPayouts(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-process-payouts', {
        body: {}
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error processing scheduled payouts:', error);
      throw error;
    }
  }

  // Get payout statistics
  static async getPayoutStats(hostId: string): Promise<{
    totalPayouts: number;
    totalAmount: number;
    lastPayoutDate?: string;
    nextPayoutDate?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('host_payouts')
        .select('amount, processed_at, created_at')
        .eq('host_id', hostId)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false });

      if (error) throw error;

      const totalPayouts = data?.length || 0;
      const totalAmount = data?.reduce((sum, payout) => sum + payout.amount, 0) || 0;
      const lastPayoutDate = data?.[0]?.processed_at;

      // Calculate next payout date based on frequency
      const { data: profile } = await supabase
        .from('profiles')
        .select('payout_frequency')
        .eq('id', hostId)
        .single();

      let nextPayoutDate: string | undefined;
      if (profile?.payout_frequency === 'weekly') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextPayoutDate = nextWeek.toISOString().split('T')[0];
      } else if (profile?.payout_frequency === 'monthly') {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextPayoutDate = nextMonth.toISOString().split('T')[0];
      }

      return {
        totalPayouts,
        totalAmount,
        lastPayoutDate,
        nextPayoutDate
      };
    } catch (error) {
      console.error('Error getting payout stats:', error);
      throw error;
    }
  }
}

