import { supabase } from '../lib/supabaseClient';

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
          kiosks:kiosk_campaigns(kiosk_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(campaign => ({
        id: campaign.id,
        name: campaign.name || `Campaign ${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`,
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
        clicks: campaign.clicks
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
    try {
      // Start a transaction
      const { data: campaign, error: campaignError } = await supabase
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
        const { error: mediaError } = await supabase
          .from('campaign_media')
          .insert({
            campaign_id: campaign.id,
            media_id: campaignData.media_asset_id,
            display_order: 0,
            weight: 1
          });

        if (mediaError) {
          console.error('Error linking media to campaign:', mediaError);
          throw mediaError;
        }

        // Update media asset with campaign ID only. Keep status as 'processing' until admin review.
        const { error: updateMediaError } = await supabase
          .from('media_assets')
          .update({ 
            campaign_id: campaign.id
          })
          .eq('id', campaignData.media_asset_id);

        if (updateMediaError) {
          console.warn('Campaign created but media asset linking failed:', updateMediaError.message);
        }
      }

      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return null;
    }
  }

  static async updateCampaignStatus(campaignId: string, status: Campaign['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;

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
      // Only delete if campaign is in draft status
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaign || campaign.status !== 'draft') {
        throw new Error('Only draft campaigns can be deleted');
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

  static async pauseCampaign(campaignId: string): Promise<boolean> {
    return this.updateCampaignStatus(campaignId, 'paused');
  }

  static async resumeCampaign(campaignId: string): Promise<boolean> {
    return this.updateCampaignStatus(campaignId, 'active');
  }
}

