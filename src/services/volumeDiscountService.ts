import { supabase } from '../lib/supabaseClient';
import { VolumeDiscountSetting, CampaignPricingBreakdown, Kiosk } from '../types/database';

export interface VolumeDiscountCalculation {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  discountReason: string;
  appliedDiscount?: VolumeDiscountSetting;
}

export interface CampaignPricing {
  totalBasePrice: number;
  totalDiscountAmount: number;
  totalFinalPrice: number;
  kioskPricing: {
    kioskId: string;
    kioskName: string;
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    discountReason: string;
  }[];
}

export class VolumeDiscountService {
  // Get all volume discount settings
  static async getVolumeDiscountSettings(): Promise<VolumeDiscountSetting[]> {
    try {
      const { data, error } = await supabase
        .from('volume_discount_settings')
        .select('*')
        .eq('is_active', true)
        .order('min_kiosks');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching volume discount settings:', error);
      return [];
    }
  }

  // Create volume discount setting
  static async createVolumeDiscountSetting(setting: {
    name: string;
    description?: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    min_kiosks: number;
    max_kiosks?: number;
    is_active?: boolean;
    valid_from?: string;
    valid_until?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('volume_discount_settings')
        .insert(setting)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating volume discount setting:', error);
      return null;
    }
  }

  // Update volume discount setting
  static async updateVolumeDiscountSetting(
    settingId: string, 
    updates: Partial<VolumeDiscountSetting>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('volume_discount_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating volume discount setting:', error);
      return false;
    }
  }

  // Delete volume discount setting
  static async deleteVolumeDiscountSetting(settingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('volume_discount_settings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting volume discount setting:', error);
      return false;
    }
  }

  // Calculate volume discount for a single kiosk
  static calculateKioskDiscount(
    kiosk: Kiosk,
    kioskIndex: number,
    totalKiosks: number,
    discountSettings: VolumeDiscountSetting[]
  ): VolumeDiscountCalculation {
    const basePrice = kiosk.price;
    let discountAmount = 0;
    let discountReason = '';
    let appliedDiscount: VolumeDiscountSetting | undefined;

    // Find applicable discount setting
    const applicableDiscount = discountSettings.find(setting => {
      const now = new Date();
      const validFrom = new Date(setting.valid_from);
      const validUntil = setting.valid_until ? new Date(setting.valid_until) : null;
      
      return (
        setting.is_active &&
        kioskIndex >= setting.min_kiosks - 1 && // -1 because index is 0-based
        (!setting.max_kiosks || kioskIndex < setting.max_kiosks) &&
        now >= validFrom &&
        (!validUntil || now <= validUntil)
      );
    });

    if (applicableDiscount) {
      appliedDiscount = applicableDiscount;
      
      if (applicableDiscount.discount_type === 'percentage') {
        discountAmount = (basePrice * applicableDiscount.discount_value) / 100;
        discountReason = `${applicableDiscount.discount_value}% volume discount (${applicableDiscount.name})`;
      } else {
        discountAmount = applicableDiscount.discount_value;
        discountReason = `$${applicableDiscount.discount_value} volume discount (${applicableDiscount.name})`;
      }
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      basePrice,
      discountAmount,
      finalPrice,
      discountReason,
      appliedDiscount
    };
  }

  // Calculate pricing for a campaign with multiple kiosks
  static async calculateCampaignPricing(
    kiosks: Kiosk[],
    campaignId?: string
  ): Promise<CampaignPricing> {
    try {
      const discountSettings = await this.getVolumeDiscountSettings();
      
      const kioskPricing = kiosks.map((kiosk, index) => {
        const calculation = this.calculateKioskDiscount(kiosk, index, kiosks.length, discountSettings);
        
        return {
          kioskId: kiosk.id,
          kioskName: kiosk.name,
          basePrice: calculation.basePrice,
          discountAmount: calculation.discountAmount,
          finalPrice: calculation.finalPrice,
          discountReason: calculation.discountReason
        };
      });

      const totalBasePrice = kioskPricing.reduce((sum, kiosk) => sum + kiosk.basePrice, 0);
      const totalDiscountAmount = kioskPricing.reduce((sum, kiosk) => sum + kiosk.discountAmount, 0);
      const totalFinalPrice = kioskPricing.reduce((sum, kiosk) => sum + kiosk.finalPrice, 0);

      // Save pricing breakdown if campaignId is provided
      if (campaignId) {
        await this.saveCampaignPricingBreakdown(campaignId, kioskPricing);
      }

      return {
        totalBasePrice,
        totalDiscountAmount,
        totalFinalPrice,
        kioskPricing
      };
    } catch (error) {
      console.error('Error calculating campaign pricing:', error);
      throw error;
    }
  }

  // Save campaign pricing breakdown
  static async saveCampaignPricingBreakdown(
    campaignId: string,
    kioskPricing: CampaignPricing['kioskPricing']
  ): Promise<boolean> {
    try {
      const breakdownData = kioskPricing.map(kiosk => ({
        campaign_id: campaignId,
        kiosk_id: kiosk.kioskId,
        base_price: kiosk.basePrice,
        discount_amount: kiosk.discountAmount,
        final_price: kiosk.finalPrice,
        discount_reason: kiosk.discountReason
      }));

      // Delete existing breakdown for this campaign
      await supabase
        .from('campaign_pricing_breakdown')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new breakdown
      const { error } = await supabase
        .from('campaign_pricing_breakdown')
        .insert(breakdownData);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving campaign pricing breakdown:', error);
      return false;
    }
  }

  // Get campaign pricing breakdown
  static async getCampaignPricingBreakdown(campaignId: string): Promise<CampaignPricingBreakdown[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_pricing_breakdown')
        .select(`
          *,
          kiosk:kiosks(name, location)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign pricing breakdown:', error);
      return [];
    }
  }

  // Update campaign with volume discount information
  static async updateCampaignWithVolumeDiscount(
    campaignId: string,
    pricing: CampaignPricing
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          total_cost: pricing.totalFinalPrice,
          volume_discount_applied: pricing.totalDiscountAmount,
          total_discount_amount: pricing.totalDiscountAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating campaign with volume discount:', error);
      return false;
    }
  }

  // Get volume discount summary for admin
  static async getVolumeDiscountSummary(): Promise<{
    totalDiscountsGiven: number;
    totalSavings: number;
    averageDiscountPercentage: number;
    mostUsedDiscount: VolumeDiscountSetting | null;
  }> {
    try {
      const { data: breakdowns } = await supabase
        .from('campaign_pricing_breakdown')
        .select('discount_amount, discount_reason');

      if (!breakdowns) {
        return {
          totalDiscountsGiven: 0,
          totalSavings: 0,
          averageDiscountPercentage: 0,
          mostUsedDiscount: null
        };
      }

      const totalSavings = breakdowns.reduce((sum, item) => sum + item.discount_amount, 0);
      const totalDiscountsGiven = breakdowns.filter(item => item.discount_amount > 0).length;
      
      // Calculate average discount percentage
      const discountReasons = breakdowns
        .filter(item => item.discount_reason?.includes('%'))
        .map(item => {
          const match = item.discount_reason?.match(/(\d+)%/);
          return match ? parseFloat(match[1]) : 0;
        });
      
      const averageDiscountPercentage = discountReasons.length > 0 
        ? discountReasons.reduce((sum, pct) => sum + pct, 0) / discountReasons.length 
        : 0;

      // Get most used discount setting
      const settings = await this.getVolumeDiscountSettings();
      const mostUsedDiscount = settings.length > 0 ? settings[0] : null;

      return {
        totalDiscountsGiven,
        totalSavings,
        averageDiscountPercentage: Math.round(averageDiscountPercentage * 100) / 100,
        mostUsedDiscount
      };
    } catch (error) {
      console.error('Error fetching volume discount summary:', error);
      return {
        totalDiscountsGiven: 0,
        totalSavings: 0,
        averageDiscountPercentage: 0,
        mostUsedDiscount: null
      };
    }
  }

  // Validate volume discount setting
  static validateVolumeDiscountSetting(setting: {
    name: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    min_kiosks: number;
    max_kiosks?: number;
    valid_from?: string;
    valid_until?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!setting.name.trim()) {
      errors.push('Name is required');
    }

    if (setting.discount_value <= 0) {
      errors.push('Discount value must be greater than 0');
    }

    if (setting.discount_type === 'percentage' && setting.discount_value > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }

    if (setting.min_kiosks < 2) {
      errors.push('Minimum kiosks must be at least 2');
    }

    if (setting.max_kiosks && setting.max_kiosks <= setting.min_kiosks) {
      errors.push('Maximum kiosks must be greater than minimum kiosks');
    }

    if (setting.valid_from && setting.valid_until) {
      const fromDate = new Date(setting.valid_from);
      const untilDate = new Date(setting.valid_until);
      
      if (fromDate >= untilDate) {
        errors.push('Valid until date must be after valid from date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
