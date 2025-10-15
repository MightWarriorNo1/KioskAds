import { supabase } from '../lib/supabaseClient';
import { CampaignEmailService } from './campaignEmailService';
import { AdminNotificationService } from './adminNotificationService';
import { getCurrentCaliforniaTime } from '../utils/dateUtils';
import { MediaService } from './mediaService';

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Utility function to clean UUID (remove any suffixes like _1)
function cleanUUID(uuid: string): string {
  // Remove any suffixes like _1, _2, etc.
  return uuid.split('_')[0];
}

// Helper function to validate media asset before campaign creation
async function validateMediaAsset(mediaId: string, userId: string): Promise<void> {
  const cleanedMediaId = cleanUUID(mediaId);
  
  if (!isValidUUID(cleanedMediaId)) {
    throw new Error(`Invalid media asset ID format: ${mediaId}`);
  }
  
  let { data: mediaAsset, error } = await supabase
    .from('media_assets')
    .select('id, user_id, status, file_name')
    .eq('id', cleanedMediaId)
    .single();

  // If the cleaned UUID fails and it's different from the original, try with the original UUID
  if (error && cleanedMediaId !== mediaId) {
    console.log('Trying with original media ID:', mediaId);
    const fallbackResult = await supabase
      .from('media_assets')
      .select('id, user_id, status, file_name')
      .eq('id', mediaId)
      .single();
    
    if (!fallbackResult.error && fallbackResult.data) {
      mediaAsset = fallbackResult.data;
      error = null;
    }
  }

  if (error) {
    console.error('Media asset validation error:', {
      mediaId: cleanedMediaId,
      originalMediaId: mediaId,
      error: error,
      errorCode: error.code,
      errorMessage: error.message
    });
    
    if (error.code === 'PGRST116' || error.message?.includes('406')) {
      throw new Error(`Media asset with ID ${cleanedMediaId} not found. The media asset may not exist or may have been deleted. Please ensure the media was uploaded successfully before creating the campaign.`);
    }
    
    throw new Error(`Failed to validate media asset: ${error.message}`);
  }

  if (!mediaAsset) {
    throw new Error(`Media asset with ID ${cleanedMediaId} not found. Please ensure the media was uploaded successfully before creating the campaign.`);
  }

  if (mediaAsset.user_id !== userId) {
    throw new Error('Media asset does not belong to the current user');
  }

  if (mediaAsset.status === 'rejected') {
    throw new Error(`Media asset "${mediaAsset.file_name}" has been rejected and cannot be used in campaigns.`);
  }

  console.log('Media asset validation successful:', {
    media_id: cleanedMediaId,
    user_id: mediaAsset.user_id,
    status: mediaAsset.status,
    file_name: mediaAsset.file_name
  });
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  start_date: string;
  end_date: string;
  budget: number;
  daily_budget?: number;
  total_slots: number;
  total_cost: number;
  kiosk_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  target_locations?: string[];
  target_demographics?: any;
  total_spent?: number;
  impressions?: number;
  clicks?: number;
  max_video_duration?: number;
  kiosks?: Kiosk[];
}

export interface Kiosk {
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
  content_restrictions?: string[]; // array of disallowed categories/phrases set by admin
  created_at: string;
  updated_at: string;
}

export class CampaignService {
  static async getUserCampaigns(userId: string): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          kiosks:kiosk_campaigns(
            kiosk_id,
            kiosks:kiosks(
              id,
              name,
              location,
              address,
              city,
              state,
              traffic_level,
              base_rate,
              price,
              status,
              coordinates,
              description
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check and update campaign statuses based on current date
      const campaignsToUpdate: string[] = [];

      for (const campaign of data || []) {
        // Check if campaign should be activated (start date reached)
        if ((campaign.status === 'pending' || campaign.status === 'approved') && new Date(campaign.start_date) <= getCurrentCaliforniaTime()) {
          campaignsToUpdate.push(campaign.id);
          await this.updateCampaignStatus(campaign.id, 'active');
        }
        // Check if campaign should be completed (end date passed)
        else if (campaign.status === 'active' && new Date(campaign.end_date) < getCurrentCaliforniaTime()) {
          campaignsToUpdate.push(campaign.id);
          await this.updateCampaignStatus(campaign.id, 'completed');
        }
      }

      // If we updated any campaigns, refetch the data to get the latest statuses
      let finalData = data;
      if (campaignsToUpdate.length > 0) {
        const { data: updatedData, error: updateError } = await supabase
          .from('campaigns')
          .select(`
            *,
            kiosks:kiosk_campaigns(
              kiosk_id,
              kiosks:kiosks(
                id,
                name,
                location,
                address,
                city,
                state,
                traffic_level,
                base_rate,
                price,
                status,
                coordinates,
                description
              )
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!updateError) {
          finalData = updatedData;
        }
      }

      // Transform the data to match our interface
      return finalData?.map(campaign => ({
        id: campaign.id,
        name: campaign.name || `Campaign ${campaign.start_date} - ${campaign.end_date}`,
        description: campaign.description,
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        budget: campaign.budget,
        daily_budget: campaign.daily_budget,
        total_slots: campaign.total_slots || 0,
        total_cost: campaign.total_cost || 0,
        kiosk_count: campaign.kiosks?.length || 0,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        user_id: campaign.user_id,
        target_locations: campaign.target_locations,
        target_demographics: campaign.target_demographics,
        total_spent: campaign.total_spent,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        kiosks: campaign.kiosks?.map((k: any) => k.kiosks).filter(Boolean) || []
      })) || [];
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      return [];
    }
  }

  static async getAvailableKiosks(): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching available kiosks:', error);
      return [];
    }
  }

  static async getKioskById(kioskId: string): Promise<Kiosk | null> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('id', kioskId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching kiosk:', error);
      return null;
    }
  }

  static async createCampaign(campaignData: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    budget: number;
    daily_budget?: number;
    total_slots: number;
    total_cost: number;
    user_id: string;
    kiosk_ids: string[];
    target_locations?: string[];
    target_demographics?: any;
    media_asset_id?: string;
    selected_kiosk_ids?: string[];
    volume_discount_applied?: number;
    total_discount_amount?: number;
    status?: Campaign['status'];
  }): Promise<Campaign | null> {
    let campaign: any = null;
    
    try {
      // Validate media asset before creating campaign
      if (campaignData.media_asset_id) {
        await validateMediaAsset(campaignData.media_asset_id, campaignData.user_id);
      }
      
      // Create campaign
      const { data: campaignData_result, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          name: campaignData.name,
          description: campaignData.description,
          start_date: campaignData.start_date,
          end_date: campaignData.end_date,
          budget: campaignData.budget,
          daily_budget: campaignData.daily_budget,
          total_slots: campaignData.total_slots,
          total_cost: campaignData.total_cost,
          user_id: campaignData.user_id,
          target_locations: campaignData.target_locations,
          target_demographics: campaignData.target_demographics,
          selected_kiosk_ids: campaignData.selected_kiosk_ids || campaignData.kiosk_ids,
          volume_discount_applied: campaignData.volume_discount_applied || 0,
          total_discount_amount: campaignData.total_discount_amount || 0,
          status: campaignData.status || 'pending'
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;
      campaign = campaignData_result;

      // Create kiosk-campaign relationships
      if (campaignData.kiosk_ids.length > 0) {
        const kioskCampaigns = campaignData.kiosk_ids.map(kioskId => ({
          campaign_id: campaign.id,
          kiosk_id: kioskId
        }));

        const { error: kioskError } = await supabase
          .from('kiosk_campaigns')
          .insert(kioskCampaigns);

        if (kioskError) throw kioskError;
      }

      // Link media asset to campaign if provided
      if (campaignData.media_asset_id) {
        const cleanedMediaId = cleanUUID(campaignData.media_asset_id);
        
        console.log('Linking media asset to campaign:', {
          campaign_id: campaign.id,
          media_id: cleanedMediaId
        });
        
        const { error: mediaError } = await supabase
          .from('campaign_media')
          .insert({
            campaign_id: campaign.id,
            media_id: cleanedMediaId,
            display_order: 0,
            weight: 1
          });

        if (mediaError) {
          console.error('Error linking media to campaign:', mediaError);
          throw new Error(`Failed to link media to campaign: ${mediaError.message}`);
        }

        // Update media asset with campaign ID
        const { error: updateMediaError } = await supabase
          .from('media_assets')
          .update({ 
            campaign_id: campaign.id
          })
          .eq('id', cleanedMediaId);

        if (updateMediaError) {
          console.warn('Campaign created but media asset linking failed:', updateMediaError.message);
          // Don't throw here as the campaign is already created
        }
      }

      // Send email notifications for new campaign
      try {
        const { data: user } = await supabase
          .from('profiles')
          .select('email, full_name, role')
          .eq('id', campaignData.user_id)
          .single();

        if (user) {
          // Send purchase confirmation email to campaign creator
          await CampaignEmailService.sendCampaignStatusNotification({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            user_id: campaignData.user_id,
            user_email: user.email,
            user_name: user.full_name,
            user_role: user.role,
            status: campaign.status,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            budget: campaign.budget,
            target_locations: campaign.target_locations?.join(', ')
          }, 'purchased');

          // Send submitted notification to campaign creator
          await CampaignEmailService.sendCampaignStatusNotification({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            user_id: campaignData.user_id,
            user_email: user.email,
            user_name: user.full_name,
            user_role: user.role,
            status: campaign.status,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            budget: campaign.budget,
            target_locations: campaign.target_locations?.join(', ')
          }, 'submitted');

          // Send admin notification
          await AdminNotificationService.sendCampaignCreatedNotification({
            type: 'campaign_created',
            user_id: campaignData.user_id,
            user_name: user.full_name,
            user_email: user.email,
            user_role: user.role as 'client' | 'host',
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            created_at: campaign.created_at
          });
        }
      } catch (error) {
        console.warn('Failed to send campaign notification:', error);
        // Don't fail the campaign creation if email fails
      }

      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      
      // If campaign was created but media linking failed, we should clean up the campaign
      if (campaign && error instanceof Error && error.message.includes('Failed to link media to campaign')) {
        console.log('Cleaning up campaign due to media linking failure:', campaign.id);
        try {
          // Delete the campaign to maintain data consistency
          await supabase.from('campaigns').delete().eq('id', campaign.id);
          console.log('Campaign cleaned up successfully');
        } catch (cleanupError) {
          console.error('Failed to clean up campaign:', cleanupError);
        }
      }
      
      return null;
    }
  }

  static async updateCampaignStatus(campaignId: string, status: Campaign['status']): Promise<boolean> {
    try {
      // Get campaign data before updating
      const { data: campaignData, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles!inner(email, full_name, role)
        `)
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaignData) {
        throw new Error('Campaign not found');
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;

      // Send email notification for status changes
      await this.sendCampaignStatusEmail(campaignData, status);

      return true;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return false;
    }
  }

  static async updateCampaign(campaignId: string, updateData: {
    name?: string;
    description?: string;
    budget?: number;
    daily_budget?: number;
    start_date?: string;
    end_date?: string;
    target_locations?: string[];
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          ...updateData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', campaignId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating campaign:', error);
      return false;
    }
  }

  static async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      // Get campaign data before deletion for email notifications
      const { data: campaignData, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles!inner(email, full_name, role)
        `)
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaignData || campaignData.status !== 'draft') {
        throw new Error('Only draft campaigns can be deleted');
      }

      // Send email notifications for campaign deletion
      try {
        await CampaignEmailService.sendCampaignStatusNotification({
          campaign_id: campaignData.id,
          campaign_name: campaignData.name,
          user_id: campaignData.user_id,
          user_email: campaignData.profiles.email,
          user_name: campaignData.profiles.full_name,
          user_role: campaignData.profiles.role,
          status: campaignData.status,
          start_date: campaignData.start_date,
          end_date: campaignData.end_date,
          budget: campaignData.budget,
          target_locations: campaignData.target_locations?.join(', ')
        }, 'cancelled');
      } catch (emailError) {
        console.warn('Failed to send campaign deletion notification:', emailError);
        // Don't fail the deletion if email fails
      }

      // Delete related mappings first (if any)
      await supabase.from('campaign_media').delete().eq('campaign_id', campaignId);
      await supabase.from('kiosk_campaigns').delete().eq('campaign_id', campaignId);

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  }

  // Cancel an active campaign (set status to cancelled)
  static async cancelCampaign(campaignId: string, reason?: string): Promise<boolean> {
    try {
      // Get campaign data before cancellation
      const { data: campaignData, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles!inner(email, full_name, role)
        `)
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaignData) {
        throw new Error('Campaign not found');
      }

      // Update campaign status to cancelled
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      // Send email notifications for campaign cancellation
      try {
        await CampaignEmailService.sendCampaignStatusNotification({
          campaign_id: campaignData.id,
          campaign_name: campaignData.name,
          user_id: campaignData.user_id,
          user_email: campaignData.profiles.email,
          user_name: campaignData.profiles.full_name,
          user_role: campaignData.profiles.role,
          status: 'cancelled',
          start_date: campaignData.start_date,
          end_date: campaignData.end_date,
          budget: campaignData.budget,
          target_locations: campaignData.target_locations?.join(', '),
          rejection_reason: reason
        }, 'cancelled');
      } catch (emailError) {
        console.warn('Failed to send campaign cancellation notification:', emailError);
        // Don't fail the cancellation if email fails
      }

      return true;
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      return false;
    }
  }

  static async pauseCampaign(campaignId: string): Promise<boolean> {
    return this.updateCampaignStatus(campaignId, 'paused');
  }

  static async resumeCampaign(campaignId: string): Promise<boolean> {
    return this.updateCampaignStatus(campaignId, 'active');
  }

  // Send email notification for campaign status change
  private static async sendCampaignStatusEmail(
    campaignData: any, 
    status: Campaign['status']
  ): Promise<void> {
    try {
      // Import the campaign email service dynamically to avoid circular dependencies
      const { CampaignEmailService } = await import('./campaignEmailService');
      
      const emailData = {
        campaign_id: campaignData.id,
        campaign_name: campaignData.name,
        user_id: campaignData.user_id,
        user_email: campaignData.profiles.email,
        user_name: campaignData.profiles.full_name,
        user_role: campaignData.profiles.role,
        status: campaignData.status,
        start_date: campaignData.start_date,
        end_date: campaignData.end_date,
        budget: campaignData.budget,
        total_spent: campaignData.total_spent,
        impressions: campaignData.impressions,
        clicks: campaignData.clicks,
        target_locations: campaignData.target_locations
      };

      // Map internal status to email status
      let emailStatus: 'approved' | 'rejected' | 'active' | 'expiring' | 'expired' | 'paused' | 'resumed';
      
      switch (status) {
        case 'active':
          emailStatus = 'active';
          break;
        case 'paused':
          emailStatus = 'paused';
          break;
        case 'completed':
          emailStatus = 'expired';
          break;
        default:
          // For other statuses, don't send email
          return;
      }

      await CampaignEmailService.sendCampaignStatusNotification(emailData, emailStatus);
    } catch (error) {
      console.error('Error sending campaign status email:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }
}

