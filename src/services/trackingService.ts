import { supabase } from '../lib/supabaseClient';
import { TrackingTag, CampaignTrackingTag } from '../types/database';

export interface TrackingTagData {
  name: string;
  platform: 'google_analytics' | 'google_tag_manager' | 'facebook_pixel' | 'bing_ads' | 'custom';
  tag_id: string;
  tag_code: string;
  is_active?: boolean;
  placement?: 'head' | 'body' | 'footer';
  conditions?: Record<string, any>;
}

export class TrackingService {
  // Get all tracking tags
  static async getTrackingTags(): Promise<TrackingTag[]> {
    try {
      const { data, error } = await supabase
        .from('tracking_tags')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tracking tags:', error);
      return [];
    }
  }

  // Get tracking tags by platform
  static async getTrackingTagsByPlatform(platform: string): Promise<TrackingTag[]> {
    try {
      const { data, error } = await supabase
        .from('tracking_tags')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tracking tags by platform:', error);
      return [];
    }
  }

  // Create tracking tag
  static async createTrackingTag(tagData: TrackingTagData): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('tracking_tags')
        .insert(tagData)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating tracking tag:', error);
      return null;
    }
  }

  // Update tracking tag
  static async updateTrackingTag(tagId: string, updates: Partial<TrackingTagData>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tracking_tags')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating tracking tag:', error);
      return false;
    }
  }

  // Delete tracking tag
  static async deleteTrackingTag(tagId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tracking_tags')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tracking tag:', error);
      return false;
    }
  }

  // Get tracking tags for a campaign
  static async getCampaignTrackingTags(campaignId: string): Promise<TrackingTag[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_tracking_tags')
        .select(`
          tracking_tag:tracking_tags(*)
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;
      return data?.map(item => item.tracking_tag).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching campaign tracking tags:', error);
      return [];
    }
  }

  // Add tracking tag to campaign
  static async addTrackingTagToCampaign(campaignId: string, trackingTagId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaign_tracking_tags')
        .insert({
          campaign_id: campaignId,
          tracking_tag_id: trackingTagId
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding tracking tag to campaign:', error);
      return false;
    }
  }

  // Remove tracking tag from campaign
  static async removeTrackingTagFromCampaign(campaignId: string, trackingTagId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaign_tracking_tags')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('tracking_tag_id', trackingTagId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing tracking tag from campaign:', error);
      return false;
    }
  }

  // Generate tracking code for a campaign
  static async generateCampaignTrackingCode(campaignId: string): Promise<{
    headCode: string;
    bodyCode: string;
    footerCode: string;
  }> {
    try {
      const tags = await this.getCampaignTrackingTags(campaignId);
      
      const headCode = tags
        .filter(tag => tag.placement === 'head')
        .map(tag => tag.tag_code)
        .join('\n');

      const bodyCode = tags
        .filter(tag => tag.placement === 'body')
        .map(tag => tag.tag_code)
        .join('\n');

      const footerCode = tags
        .filter(tag => tag.placement === 'footer')
        .map(tag => tag.tag_code)
        .join('\n');

      return { headCode, bodyCode, footerCode };
    } catch (error) {
      console.error('Error generating campaign tracking code:', error);
      return { headCode: '', bodyCode: '', footerCode: '' };
    }
  }

  // Get tracking analytics data
  static async getTrackingAnalytics(campaignId: string, platform?: string): Promise<{
    platform: string;
    tagId: string;
    impressions: number;
    clicks: number;
    conversions: number;
  }[]> {
    try {
      // This would integrate with the respective analytics platforms
      // For now, return mock data
      const tags = await this.getCampaignTrackingTags(campaignId);
      
      return tags
        .filter(tag => !platform || tag.platform === platform)
        .map(tag => ({
          platform: tag.platform,
          tagId: tag.tag_id,
          impressions: Math.floor(Math.random() * 1000),
          clicks: Math.floor(Math.random() * 100),
          conversions: Math.floor(Math.random() * 10)
        }));
    } catch (error) {
      console.error('Error fetching tracking analytics:', error);
      return [];
    }
  }

  // Validate tracking tag code
  static validateTrackingTagCode(platform: string, tagCode: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (platform) {
      case 'google_analytics':
        if (!tagCode.includes('gtag') && !tagCode.includes('ga(')) {
          errors.push('Google Analytics code should contain gtag or ga() function');
        }
        break;
      case 'facebook_pixel':
        if (!tagCode.includes('fbq') && !tagCode.includes('Facebook Pixel')) {
          errors.push('Facebook Pixel code should contain fbq function');
        }
        break;
      case 'bing_ads':
        if (!tagCode.includes('uetq') && !tagCode.includes('Bing UET')) {
          errors.push('Bing Ads code should contain uetq function');
        }
        break;
      case 'google_tag_manager':
        if (!tagCode.includes('gtm') && !tagCode.includes('Google Tag Manager')) {
          errors.push('Google Tag Manager code should contain gtm reference');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Test tracking tag
  static async testTrackingTag(tagId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // In a real implementation, this would make a test request to the tracking platform
      // For now, return a mock response
      console.log('Testing tracking tag:', tagId);
      
      return {
        success: true,
        message: 'Tracking tag test successful'
      };
    } catch (error) {
      console.error('Error testing tracking tag:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
