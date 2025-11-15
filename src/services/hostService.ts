import { supabase } from '../lib/supabaseClient';
import { getCurrentCaliforniaTime } from '../utils/dateUtils';
import { AdminService } from './adminService';

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
      allowedUpdates.updated_at = getCurrentCaliforniaTime().toISOString();

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

      // Send immediate notification to admin
      try {
        console.log('📧 Sending host ad submission notification for ad ID:', adId);
        await AdminService.sendHostAdSubmissionNotification(adId);
        console.log('✅ Host ad submission notification sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending host ad submission notification:', emailError);
        // Don't throw error - submission should succeed even if email fails
      }
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

      // Check if the ad is approved (either 'approved' or 'active' status)
      if (adOwnership.status !== 'approved' && adOwnership.status !== 'active') {
        throw new Error('This ad must be approved before it can be assigned to kiosks.');
      }

      // Determine assignment status based on start date
      const startDate = new Date(assignmentData.startDate + 'T00:00:00'); // Ensure we're comparing dates, not times
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at midnight
      const isImmediate = startDate <= today;
      console.log('[HostService.createAdAssignment] DEBUG: Date comparison details:', {
        startDateString: assignmentData.startDate,
        startDateParsed: startDate.toISOString(),
        now: now.toISOString(),
        today: today.toISOString(),
        isImmediate: isImmediate,
        timeDiff: startDate.getTime() - today.getTime()
      });
      
      console.log('[HostService.createAdAssignment] creating assignment', {
        hostId: assignmentData.hostId,
        adId: assignmentData.adId,
        kioskId: assignmentData.kioskId,
        startDate: assignmentData.startDate,
        endDate: assignmentData.endDate,
        isImmediate
      });
      
      const { data, error } = await supabase
        .from('host_ad_assignments')
        .insert({
          host_id: assignmentData.hostId,
          ad_id: assignmentData.adId,
          kiosk_id: assignmentData.kioskId,
          start_date: assignmentData.startDate,
          end_date: assignmentData.endDate,
          priority: assignmentData.priority || 1,
          status: isImmediate ? 'active' : 'pending'
        })
        .select(`
          *,
          ad:host_ads(*),
          kiosk:kiosks(id, name, location, city, state)
        `)
        .single();

      if (error) throw error;

      // If assignment is active immediately, update the ad status to active
      if (isImmediate) {
        try {
          console.log('[HostService.createAdAssignment] setting host ad active', assignmentData.adId);
          await supabase
            .from('host_ads')
            .update({ 
              status: 'active',
              updated_at: getCurrentCaliforniaTime().toISOString()
            })
            .eq('id', assignmentData.adId);
          console.log('[HostService.createAdAssignment] host ad set active OK');
        } catch (updateError) {
          console.error('Error updating ad status to active:', updateError);
          // Don't throw error - assignment was successful
        }

      }

      // Trigger Google Drive upload for this approved host ad to assigned kiosks (both immediate and scheduled)
      try {
        console.log('[HostService.createAdAssignment] DEBUG: Invoking edge function upload-approved-host-ad for hostAdId', assignmentData.adId, 'with assignment data:', {
          startDate: assignmentData.startDate,
          endDate: assignmentData.endDate,
          isImmediate: isImmediate
        });
        
        if (isImmediate) {
          console.log('[HostService.createAdAssignment] DEBUG: This is an IMMEDIATE assignment - will upload to ACTIVE folder');
        } else {
          console.log('[HostService.createAdAssignment] DEBUG: This is a SCHEDULED assignment - will upload to SCHEDULED folder');
        }
        const { data: invokeData, error: invokeErr } = await supabase.functions.invoke('upload-approved-host-ad', {
          body: { 
            hostAdId: assignmentData.adId,
            isImmediate: isImmediate // Pass the already calculated isImmediate flag
          }
        });
        if (invokeErr) {
          console.error('[HostService.createAdAssignment] DEBUG: upload-approved-host-ad invocation error', invokeErr);
        } else {
          console.log('[HostService.createAdAssignment] DEBUG: upload-approved-host-ad invocation result', invokeData);
        }
      } catch (driveError) {
        console.error('[HostService.createAdAssignment] DEBUG: Error triggering Google Drive upload:', driveError);
        // Swallow error so assignment creation isn't blocked
      }

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

  // Process scheduled assignments (should be called by a cron job)
  static async processScheduledAssignments(): Promise<void> {
    try {
      const now = getCurrentCaliforniaTime().toISOString();
      
      // Find assignments that should become active
      const { data: assignmentsToActivate, error: fetchError } = await supabase
        .from('host_ad_assignments')
        .select(`
          id,
          ad_id,
          start_date,
          host_ads!inner(id, status)
        `)
        .eq('status', 'pending')
        .lte('start_date', now);

      if (fetchError) throw fetchError;

      if (!assignmentsToActivate || assignmentsToActivate.length === 0) {
        return; // No assignments to process
      }

      // Update assignments to active
      const assignmentIds = assignmentsToActivate.map(a => a.id);
      const { error: updateError } = await supabase
        .from('host_ad_assignments')
        .update({ status: 'active' })
        .in('id', assignmentIds);

      if (updateError) throw updateError;

      // Update ad statuses to active for ads that now have active assignments
      const adIds = [...new Set(assignmentsToActivate.map(a => a.ad_id))];
      const { error: adUpdateError } = await supabase
        .from('host_ads')
        .update({ 
          status: 'active',
          updated_at: now
        })
        .in('id', adIds)
        .eq('status', 'approved'); // Only update approved ads

      if (adUpdateError) {
        console.error('Error updating ad statuses:', adUpdateError);
        // Don't throw - assignment updates were successful
      }

      // Upload to Google Drive for newly active assignments
      try {
        const { GoogleDriveService } = await import('./googleDriveService');
        for (const adId of adIds) {
          await GoogleDriveService.uploadApprovedHostAdToAssignedKiosks(adId);
        }
      } catch (driveError) {
        console.error('Error uploading to Google Drive:', driveError);
        // Don't throw - assignment processing was successful
      }

      console.log(`Processed ${assignmentsToActivate.length} scheduled assignments`);

    } catch (error) {
      console.error('Error processing scheduled assignments:', error);
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
        updated_at: getCurrentCaliforniaTime().toISOString()
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
          updated_at: getCurrentCaliforniaTime().toISOString()
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
      // Fetch revenue data and calculate summary directly
      const revenueData = await this.getHostRevenue(hostId, startDate, endDate);
      
      const summary = revenueData.reduce(
        (acc, record) => ({
          total_revenue: acc.total_revenue + (Number(record.revenue) || 0),
          total_commission: acc.total_commission + (Number(record.commission) || 0),
          total_impressions: acc.total_impressions + (Number(record.impressions) || 0),
          total_clicks: acc.total_clicks + (Number(record.clicks) || 0)
        }),
        {
          total_revenue: 0,
          total_commission: 0,
          total_impressions: 0,
          total_clicks: 0
        }
      );

      return summary;
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      // Return default values on error instead of throwing
      return {
        total_revenue: 0,
        total_commission: 0,
        total_impressions: 0,
        total_clicks: 0
      };
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
      const now = getCurrentCaliforniaTime();
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


