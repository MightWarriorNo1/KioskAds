import { supabase } from '../lib/supabaseClient';

export interface HostKiosk {
  id: string;
  host_id: string;
  kiosk_id: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'suspended';
  commission_rate: number;
  kiosk: {
    id: string;
    name: string;
    location: string;
    address: string;
    city: string;
    state: string;
    traffic_level: 'low' | 'medium' | 'high';
    base_rate: number;
    price: number;
    status: 'active' | 'inactive' | 'maintenance';
    coordinates: {
      lat: number;
      lng: number;
    };
    description?: string;
  };
}

export interface HostAd {
  id: string;
  host_id: string;
  name: string;
  description?: string;
  media_url: string;
  media_type: 'image' | 'video';
  duration: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active' | 'paused';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface HostAdAssignment {
  id: string;
  host_id: string;
  ad_id: string;
  kiosk_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed';
  priority: number;
  ad: HostAd;
  kiosk: {
    id: string;
    name: string;
    location: string;
    city: string;
    state: string;
  };
}

export interface HostRevenue {
  id: string;
  host_id: string;
  kiosk_id: string;
  ad_assignment_id?: string;
  date: string;
  impressions: number;
  clicks: number;
  revenue: number;
  commission: number;
  kiosk: {
    name: string;
    location: string;
  };
}

export interface HostPayout {
  id: string;
  host_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method: 'bank_transfer' | 'stripe_connect';
  stripe_transfer_id?: string;
  bank_account_id?: string;
  period_start: string;
  period_end: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HostPayoutStatement {
  id: string;
  payout_id: string;
  kiosk_id: string;
  ad_assignment_id?: string;
  impressions: number;
  clicks: number;
  revenue: number;
  commission_rate: number;
  commission_amount: number;
  kiosk: {
    name: string;
    location: string;
  };
}


export interface HostStats {
  total_kiosks: number;
  active_kiosks: number;
  total_impressions: number;
  total_revenue: number;
  pending_ads: number;
  active_assignments: number;
  monthly_revenue: number;
  weekly_revenue: number;
  daily_revenue: number;
}

export class HostService {
  // Get host's assigned kiosks
  static async getHostKiosks(hostId: string): Promise<HostKiosk[]> {
    try {
      const { data, error } = await supabase
        .from('host_kiosks')
        .select(`
          *,
          kiosk:kiosks(*)
        `)
        .eq('host_id', hostId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        kiosk: item.kiosk
      })) || [];
    } catch (error) {
      console.error('Error fetching host kiosks:', error);
      throw error;
    }
  }

  // Get host's ads
  static async getHostAds(hostId: string, status?: string): Promise<HostAd[]> {
    try {
      let query = supabase
        .from('host_ads')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching host ads:', error);
      throw error;
    }
  }

  // Upload new ad
  static async uploadAd(adData: {
    hostId: string;
    name: string;
    description?: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    duration: number;
  }): Promise<HostAd> {
    try {
      const { data, error } = await supabase
        .from('host_ads')
        .insert({
          host_id: adData.hostId,
          name: adData.name,
          description: adData.description,
          media_url: adData.mediaUrl,
          media_type: adData.mediaType,
          duration: adData.duration,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading ad:', error);
      throw error;
    }
  }

  // Submit ad for review
  static async submitAdForReview(adId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('host_ads')
        .update({ status: 'pending_review' })
        .eq('id', adId);

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting ad for review:', error);
      throw error;
    }
  }

  // Get host's ad assignments
  static async getHostAdAssignments(hostId: string, status?: string): Promise<HostAdAssignment[]> {
    try {
      let query = supabase
        .from('host_ad_assignments')
        .select(`
          *,
          ad:host_ads(*),
          kiosk:kiosks(id, name, location, city, state)
        `)
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        ad: item.ad,
        kiosk: item.kiosk
      })) || [];
    } catch (error) {
      console.error('Error fetching ad assignments:', error);
      throw error;
    }
  }

  // Create new ad assignment
  static async createAdAssignment(assignmentData: {
    hostId: string;
    adId: string;
    kioskId: string;
    startDate: string;
    endDate: string;
    priority?: number;
  }): Promise<HostAdAssignment> {
    try {
      const { data, error } = await supabase
        .from('host_ad_assignments')
        .insert({
          host_id: assignmentData.hostId,
          ad_id: assignmentData.adId,
          kiosk_id: assignmentData.kioskId,
          start_date: assignmentData.startDate,
          end_date: assignmentData.endDate,
          priority: assignmentData.priority || 1,
          status: 'pending'
        })
        .select(`
          *,
          ad:host_ads(*),
          kiosk:kiosks(id, name, location, city, state)
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        ad: data.ad,
        kiosk: data.kiosk
      };
    } catch (error) {
      console.error('Error creating ad assignment:', error);
      throw error;
    }
  }

  // Get host revenue data
  static async getHostRevenue(
    hostId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<HostRevenue[]> {
    try {
      let query = supabase
        .from('host_revenue')
        .select(`
          *,
          kiosk:kiosks(name, location)
        `)
        .eq('host_id', hostId)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        kiosk: item.kiosk
      })) || [];
    } catch (error) {
      console.error('Error fetching host revenue:', error);
      throw error;
    }
  }

  // Get host revenue summary
  static async getHostRevenueSummary(
    hostId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    total_revenue: number;
    total_commission: number;
    total_impressions: number;
    total_clicks: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('calculate_host_revenue', {
        p_host_id: hostId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data?.[0] || {
        total_revenue: 0,
        total_commission: 0,
        total_impressions: 0,
        total_clicks: 0
      };
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      throw error;
    }
  }

  // Get host payouts
  static async getHostPayouts(hostId: string): Promise<HostPayout[]> {
    try {
      const { data, error } = await supabase
        .from('host_payouts')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching host payouts:', error);
      throw error;
    }
  }

  // Get payout statements
  static async getPayoutStatements(payoutId: string): Promise<HostPayoutStatement[]> {
    try {
      const { data, error } = await supabase
        .from('host_payout_statements')
        .select(`
          *,
          kiosk:kiosks(name, location)
        `)
        .eq('payout_id', payoutId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        kiosk: item.kiosk
      })) || [];
    } catch (error) {
      console.error('Error fetching payout statements:', error);
      throw error;
    }
  }


  // Get host statistics
  static async getHostStats(hostId: string): Promise<HostStats> {
    try {
      // Get kiosk stats
      const { data: kioskStats, error: kioskError } = await supabase.rpc('get_host_kiosk_stats', {
        p_host_id: hostId
      });

      if (kioskError) throw kioskError;

      // Get pending ads count
      const { count: pendingAds, error: adsError } = await supabase
        .from('host_ads')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId)
        .eq('status', 'pending_review');

      if (adsError) throw adsError;

      // Get active assignments count
      const { count: activeAssignments, error: assignmentsError } = await supabase
        .from('host_ad_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId)
        .eq('status', 'active');

      if (assignmentsError) throw assignmentsError;

      // Get revenue for different periods
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [dailyRevenue, weeklyRevenue, monthlyRevenue] = await Promise.all([
        this.getHostRevenueSummary(hostId, today, today),
        this.getHostRevenueSummary(hostId, weekAgo, today),
        this.getHostRevenueSummary(hostId, monthAgo, today)
      ]);

      return {
        total_kiosks: kioskStats?.[0]?.total_kiosks || 0,
        active_kiosks: kioskStats?.[0]?.active_kiosks || 0,
        total_impressions: kioskStats?.[0]?.total_impressions || 0,
        total_revenue: kioskStats?.[0]?.total_revenue || 0,
        pending_ads: pendingAds || 0,
        active_assignments: activeAssignments || 0,
        monthly_revenue: monthlyRevenue.total_commission,
        weekly_revenue: weeklyRevenue.total_commission,
        daily_revenue: dailyRevenue.total_commission
      };
    } catch (error) {
      console.error('Error fetching host stats:', error);
      throw error;
    }
  }

  // Update host payout settings
  static async updatePayoutSettings(
    hostId: string,
    settings: {
      payout_frequency?: 'weekly' | 'monthly';
      minimum_payout?: number;
      stripe_connect_account_id?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', hostId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payout settings:', error);
      throw error;
    }
  }

  // Get host profile with payout settings
  static async getHostProfile(hostId: string): Promise<{
    id: string;
    email: string;
    full_name: string;
    payout_frequency: string;
    minimum_payout: number;
    stripe_connect_enabled: boolean;
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, payout_frequency, minimum_payout, stripe_connect_enabled')
        .eq('id', hostId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching host profile:', error);
      throw error;
    }
  }
}

