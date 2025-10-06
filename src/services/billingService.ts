import { supabase } from '../lib/supabaseClient';
import { PaymentMethod } from '../types/database';

export interface BillingCampaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  total_cost: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'paused';
  auto_renewal: boolean;
  start_date: string;
  end_date?: string;
  created_at: string;
  linked_campaigns: string[];
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  campaign_id?: string;
  custom_ad_order_id?: string;
  payment_type: 'campaign' | 'custom_ad';
  amount: number;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description?: string;
  payment_date: string;
  created_at: string;
}

export interface RecentSale {
  id: string;
  user_id: string;
  campaign_id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  payment_date: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    company_name?: string;
  };
  campaign: {
    id: string;
    name: string;
    description?: string;
  };
}

export class BillingService {
  static async createPaymentIntent(params: { amount: number; currency?: string; metadata?: Record<string, string>; setupForFutureUse?: boolean }): Promise<{ clientSecret: string } | null> {
    try {
      const requestBody: Record<string, unknown> = {
        amount: Math.round(params.amount),
        currency: params.currency || 'usd',
        metadata: params.metadata,
        setupForFutureUse: params.setupForFutureUse || false,
      };
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: requestBody,
      });

      if (error) {
        console.error('Failed to create payment intent', error);
        return null;
      }

      return { clientSecret: (data as any)?.clientSecret };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return null;
    }
  }
  static async getActiveCampaigns(userId: string): Promise<BillingCampaign[]> {
    try {
      // First, check and update campaign statuses based on current date
      const { data: allCampaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Check and update campaign statuses
      for (const campaign of allCampaigns || []) {
        // Check if campaign should be activated (start date reached)
        if ((campaign.status === 'pending' || campaign.status === 'approved') && new Date(campaign.start_date) <= new Date()) {
          await this.updateCampaignStatus(campaign.id, 'active');
        }
        // Check if campaign should be completed (end date passed)
        else if (campaign.status === 'active' && new Date(campaign.end_date) < new Date()) {
          await this.updateCampaignStatus(campaign.id, 'completed');
        }
      }

      // Now fetch only active campaigns
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  }

  static async getAllCampaigns(userId: string): Promise<BillingCampaign[]> {
    try {
      // First, check and update campaign statuses based on current date
      const { data: allCampaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Check and update campaign statuses
      for (const campaign of allCampaigns || []) {
        // Check if campaign should be activated (start date reached)
        if ((campaign.status === 'pending' || campaign.status === 'approved') && new Date(campaign.start_date) <= new Date()) {
          await this.updateCampaignStatus(campaign.id, 'active');
        }
        // Check if campaign should be completed (end date passed)
        else if (campaign.status === 'active' && new Date(campaign.end_date) < new Date()) {
          await this.updateCampaignStatus(campaign.id, 'completed');
        }
      }

      // Now fetch all campaigns with updated statuses
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  static async updateCampaignStatus(campaignId: string, status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return false;
    }
  }

  static async getSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          linked_campaigns:subscription_campaigns(campaign_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(subscription => ({
        id: subscription.id,
        user_id: subscription.user_id,
        status: subscription.status,
        auto_renewal: subscription.auto_renewal,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        created_at: subscription.created_at,
        linked_campaigns: subscription.linked_campaigns?.map((lc: any) => lc.campaign_id) || []
      })) || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  static async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          campaigns(name)
        `)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(payment => ({
        id: payment.id,
        user_id: payment.user_id,
        campaign_id: payment.campaign_id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description || (payment.campaigns?.name ? `Campaign: ${payment.campaigns.name}` : 'Campaign Payment'),
        payment_date: payment.payment_date,
        created_at: payment.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  static async createSubscription(userId: string, subscriptionData: {
    auto_renewal: boolean;
    start_date: string;
    end_date?: string;
  }): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          status: 'active',
          auto_renewal: subscriptionData.auto_renewal,
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        status: data.status,
        auto_renewal: data.auto_renewal,
        start_date: data.start_date,
        end_date: data.end_date,
        created_at: data.created_at,
        linked_campaigns: []
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return null;
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  static async createPaymentRecord(paymentData: {
    user_id: string;
    campaign_id?: string;
    custom_ad_order_id?: string;
    payment_type: 'campaign' | 'custom_ad';
    amount: number;
    status: 'succeeded' | 'pending' | 'failed';
    description?: string;
  }): Promise<PaymentHistory | null> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .insert([{
          user_id: paymentData.user_id,
          campaign_id: paymentData.campaign_id,
          custom_ad_order_id: paymentData.custom_ad_order_id,
          payment_type: paymentData.payment_type,
          amount: paymentData.amount,
          status: paymentData.status,
          description: paymentData.description,
          payment_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        campaign_id: data.campaign_id,
        custom_ad_order_id: data.custom_ad_order_id,
        payment_type: data.payment_type,
        amount: data.amount,
        status: data.status,
        description: data.description,
        payment_date: data.payment_date,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error creating payment record:', error);
      return null;
    }
  }

  static async getBillingSummary(userId: string): Promise<{
    totalSpent: number;
    activeCampaigns: number;
    activeSubscriptions: number;
    monthlySpend: number;
  }> {
    try {
      const [campaigns, subscriptions, payments] = await Promise.all([
        this.getAllCampaigns(userId),
        this.getSubscriptions(userId),
        this.getPaymentHistory(userId)
      ]);

      const totalSpent = payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;

      // Calculate monthly spend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthlySpend = payments
        .filter(p => p.status === 'succeeded' && new Date(p.payment_date) >= thirtyDaysAgo)
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        totalSpent,
        activeCampaigns,
        activeSubscriptions,
        monthlySpend
      };
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      return {
        totalSpent: 0,
        activeCampaigns: 0,
        activeSubscriptions: 0,
        monthlySpend: 0
      };
    }
  }

  static async getRecentSales(limit: number = 3): Promise<RecentSale[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          profiles!payment_history_user_id_fkey(
            id,
            full_name,
            company_name
          ),
          campaigns!payment_history_campaign_id_fkey(
            id,
            name,
            description
          )
        `)
        .eq('status', 'succeeded')
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent sales:', error);
        throw error;
      }

      return data?.map(payment => ({
        id: payment.id,
        user_id: payment.user_id,
        campaign_id: payment.campaign_id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        payment_date: payment.payment_date,
        created_at: payment.created_at,
        user: {
          id: payment.profiles.id,
          full_name: payment.profiles.full_name,
          company_name: payment.profiles.company_name
        },
        campaign: {
          id: payment.campaigns.id,
          name: payment.campaigns.name,
          description: payment.campaigns.description
        }
      })) || [];
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      return [];
    }
  }

  // Public method for recent sales that works without authentication
  static async getPublicRecentSales(limit: number = 3): Promise<RecentSale[]> {
    try {
      // Use a direct query that bypasses RLS for public access
      const { data, error } = await supabase
        .rpc('get_recent_sales_public', { limit_count: limit });

      if (error) {
        console.error('Error fetching public recent sales:', error);
        // Fallback to regular method if RPC fails
        return this.getRecentSales(limit);
      }

      // Transform the RPC response to match our interface
      return data?.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        campaign_id: item.campaign_id,
        amount: item.amount,
        status: item.status,
        description: item.description,
        payment_date: item.payment_date,
        created_at: item.created_at,
        user: {
          id: item.user_data.id,
          full_name: item.user_data.full_name,
          company_name: item.user_data.company_name
        },
        campaign: {
          id: item.campaign_data.id,
          name: item.campaign_data.name,
          description: item.campaign_data.description
        }
      })) || [];
    } catch (error) {
      console.error('Error fetching public recent sales:', error);
      // Fallback to regular method if RPC fails
      return this.getRecentSales(limit);
    }
  }

  // Payment Method Management Functions
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  static async savePaymentMethod(paymentMethodData: {
    user_id: string;
    stripe_payment_method_id: string;
    type: 'card' | 'bank_account';
    last4?: string;
    brand?: string;
    expiry_month?: number;
    expiry_year?: number;
  }): Promise<PaymentMethod | null> {
    try {
      // Use Supabase function to save payment method
      const { data, error } = await supabase.functions.invoke('save-payment-method', {
        body: {
          paymentMethodId: paymentMethodData.stripe_payment_method_id,
          userId: paymentMethodData.user_id
        }
      });

      if (error) {
        console.error('Error calling save-payment-method function:', error);
        return null;
      }

      return data?.paymentMethod || null;
    } catch (error) {
      console.error('Error saving payment method:', error);
      return null;
    }
  }

  static async setDefaultPaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      // Get the payment method to find the user_id
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('payment_methods')
        .select('user_id')
        .eq('id', paymentMethodId)
        .single();

      if (fetchError) throw fetchError;

      // Set all payment methods for this user to not default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', paymentMethod.user_id);

      // Set the selected payment method as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return false;
    }
  }

  static async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  }

  static async createPaymentIntentWithPaymentMethod(params: { 
    amount: number; 
    currency?: string; 
    paymentMethodId?: string;
    metadata?: Record<string, string>; 
  }): Promise<{ clientSecret: string } | null> {
    try {
      const requestBody: Record<string, unknown> = {
        amount: Math.round(params.amount),
        currency: params.currency || 'usd',
        metadata: params.metadata,
      };
      
      if (params.paymentMethodId) {
        requestBody.paymentMethodId = params.paymentMethodId;
      }
      
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: requestBody,
      });

      if (error) {
        console.error('Failed to create payment intent', error);
        return null;
      }

      return { clientSecret: (data as any)?.clientSecret };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return null;
    }
  }
}