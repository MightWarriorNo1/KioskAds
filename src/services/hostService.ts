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
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active' | 'paused' | 'swapped';
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
      console.log('Fetching kiosks for host:', hostId);
      
      // First, let's check if the host exists and get their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', hostId)
        .single();

      if (profileError) {
        console.error('Error fetching host profile:', profileError);
        throw profileError;
      }

      console.log('Host profile:', profile);

      if (!profile || profile.role !== 'host') {
        console.log('User is not a host or profile not found');
        return [];
      }

      // Now get the host's kiosk assignments
      const { data, error } = await supabase
        .from('host_kiosks')
        .select(`
          *,
          kiosk:kiosks(*)
        `)
        .eq('host_id', hostId)
        .eq('status', 'active') // Only get active host-kiosk assignments
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Raw data from database:', data);

      // If no assignments exist, let's check if there are any kiosks available
      if (!data || data.length === 0) {
        console.log('No host-kiosk assignments found. Checking available kiosks...');
        
        // For development/testing, let's create some sample assignments
        // This is a temporary solution - in production, admins should assign kiosks
        const { data: availableKiosks, error: kioskError } = await supabase
          .from('kiosks')
          .select('*')
          .eq('status', 'active')
          .limit(2);

        if (kioskError) {
          console.error('Error fetching available kiosks:', kioskError);
        } else if (availableKiosks && availableKiosks.length > 0) {
          console.log('Found available kiosks, creating sample assignments...');
          
          // Create sample assignments for development
          for (const kiosk of availableKiosks.slice(0, 2)) {
            const { error: insertError } = await supabase
              .from('host_kiosks')
              .insert({
                host_id: hostId,
                kiosk_id: kiosk.id,
                commission_rate: 70.00,
                status: 'active'
              })
              .select();

            if (insertError) {
              console.log('Assignment already exists or error:', insertError.message);
            } else {
              console.log('Created assignment for kiosk:', kiosk.name);
            }
          }

          // Now fetch the assignments again
          const { data: newData, error: newError } = await supabase
            .from('host_kiosks')
            .select(`
              *,
              kiosk:kiosks(*)
            `)
            .eq('host_id', hostId)
            .eq('status', 'active')
            .order('assigned_at', { ascending: false });

          if (newError) {
            console.error('Error fetching new assignments:', newError);
            return [];
          }

          console.log('New assignments data:', newData);
          return newData?.map(item => ({
            ...item,
            kiosk: item.kiosk
          })) || [];
        }
      }

      // Filter to only include kiosks that are also active
      const activeKiosks = data?.filter(item => 
        item.kiosk && item.kiosk.status === 'active'
      ).map(item => ({
        ...item,
        kiosk: item.kiosk
      })) || [];

      console.log('Filtered active kiosks:', activeKiosks);
      return activeKiosks;
    } catch (error) {
      console.error('Error fetching host kiosks:', error);
      throw error;
    }
  }

  // Validate that a host owns a specific kiosk
  static async validateKioskOwnership(hostId: string, kioskId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('host_kiosks')
        .select('id')
        .eq('host_id', hostId)
        .eq('kiosk_id', kioskId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating kiosk ownership:', error);
      return false;
    }
  }

  // Update existing ad (restrict edits when active; asset changes trigger re-approval)
  static async updateAd(
    adId: string,
    updates: Partial<Pick<HostAd, 'name' | 'description' | 'media_url' | 'media_type' | 'duration'>>
  ): Promise<HostAd> {
    try {
      // Fetch current ad to determine status and enforce rules
      const { data: existing, error: fetchError } = await supabase
        .from('host_ads')
        .select('*')
        .eq('id', adId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Ad not found');

      const isActive = existing.status === 'active';

      // If ad is active, only allow media_url/media_type (and optionally duration)
      let allowedUpdates: Record<string, any> = { ...updates };
      if (isActive) {
        const { media_url, media_type, duration } = updates;
        allowedUpdates = {};
        if (typeof media_url === 'string') allowedUpdates.media_url = media_url;
        if (typeof media_type === 'string') allowedUpdates.media_type = media_type;
        if (typeof duration === 'number') allowedUpdates.duration = duration;

        // If no asset-related fields are changing, block the update on active ads
        if (Object.keys(allowedUpdates).length === 0) {
          throw new Error('Active ads can only change the ad asset (media and duration)');
        }

        // Asset change requires re-approval
        allowedUpdates.status = 'pending_review';
      }

      // Always update timestamp
      allowedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('host_ads')
        .update(allowedUpdates)
        .eq('id', adId)
        .select('*')
        .single();

      if (error) throw error;
      return data as HostAd;
    } catch (error) {
      console.error('Error updating host ad:', error);
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
      // Validate that the host owns this kiosk
      const hasKioskOwnership = await this.validateKioskOwnership(assignmentData.hostId, assignmentData.kioskId);
      if (!hasKioskOwnership) {
        throw new Error('You do not have permission to assign ads to this kiosk');
      }

      // Validate that the ad belongs to the host and check if it's already approved
      const { data: adOwnership, error: adError } = await supabase
        .from('host_ads')
        .select('id, status')
        .eq('id', assignmentData.adId)
        .eq('host_id', assignmentData.hostId)
        .single();

      if (adError || !adOwnership) {
        throw new Error('You do not have permission to assign this ad');
      }

      // Check if the ad is already approved and automatically assigned
      if (adOwnership.status === 'active') {
        // Check if there are existing active assignments for this ad
        const { data: existingAssignments, error: existingError } = await supabase
          .from('host_ad_assignments')
          .select('id, status')
          .eq('ad_id', assignmentData.adId)
          .eq('status', 'active');

        if (existingError) throw existingError;

        if (existingAssignments && existingAssignments.length > 0) {
          throw new Error('This ad has already been approved and automatically assigned to your kiosks. You cannot manually assign it again.');
        }
      }

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

  // Delete ad
  static async deleteAd(adId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('host_ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting ad:', error);
      throw error;
    }
  }

  // Pause ad
  static async pauseAd(adId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('host_ads')
        .update({ status: 'paused' })
        .eq('id', adId);

      if (error) throw error;
    } catch (error) {
      console.error('Error pausing ad:', error);
      throw error;
    }
  }

  // Resume ad
  static async resumeAd(adId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('host_ads')
        .update({ status: 'active' })
        .eq('id', adId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resuming ad:', error);
      throw error;
    }
  }

  // Swap ad asset (for active ads only)
  static async swapAdAsset(
    adId: string,
    newMediaUrl: string,
    newMediaType: 'image' | 'video',
    newDuration?: number
  ): Promise<HostAd> {
    try {
      // First, verify the ad is active
      const { data: existing, error: fetchError } = await supabase
        .from('host_ads')
        .select('*')
        .eq('id', adId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Ad not found');
      if (existing.status !== 'active') {
        throw new Error('Only active ads can have their assets swapped');
      }

      // Update the ad with new asset and set status to swapped
      const updateData: any = {
        media_url: newMediaUrl,
        media_type: newMediaType,
        status: 'swapped',
        updated_at: new Date().toISOString()
      };

      if (newDuration !== undefined) {
        updateData.duration = newDuration;
      }

      const { data, error } = await supabase
        .from('host_ads')
        .update(updateData)
        .eq('id', adId)
        .select('*')
        .single();

      if (error) throw error;
      return data as HostAd;
    } catch (error) {
      console.error('Error swapping ad asset:', error);
      throw error;
    }
  }

  // Submit swapped ad for review
  static async submitSwappedAdForReview(adId: string): Promise<void> {
    try {
      // Verify the ad is in swapped status
      const { data: existing, error: fetchError } = await supabase
        .from('host_ads')
        .select('status')
        .eq('id', adId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Ad not found');
      if (existing.status !== 'swapped') {
        throw new Error('Only swapped ads can be submitted for review');
      }

      // Update status to pending_review
      const { error } = await supabase
        .from('host_ads')
        .update({ 
          status: 'pending_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', adId);

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting swapped ad for review:', error);
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

      // Get pending ads count (treat campaigns as ads for hosts)
      const { count: pendingCampaigns, error: pendingCampErr } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', hostId)
        .eq('status', 'pending');

      if (pendingCampErr) throw pendingCampErr;

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
        pending_ads: pendingCampaigns || 0,
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

