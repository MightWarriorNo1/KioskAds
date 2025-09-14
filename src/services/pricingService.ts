import { supabase } from '../lib/supabaseClient';
import { VolumeDiscountService, CampaignPricing } from './volumeDiscountService';
import { Kiosk } from './campaignService';

export interface PricingCalculation {
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

export class PricingService {
  static async getAdditionalKioskDiscountPercent(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'additional_kiosk_discount_percent')
        .single();

      if (error) return 10; // default 10%

      const value = data?.value;
      if (typeof value === 'number') return value;
      if (value && typeof value.percent === 'number') return value.percent;
      return 10;
    } catch {
      return 10;
    }
  }

  // Legacy method for backward compatibility
  static calculateCampaignCost(params: {
    baseRatePerSlot: number;
    totalSlots: number;
    numKiosks: number;
    discountPercent: number;
  }): number {
    const { baseRatePerSlot, totalSlots, numKiosks, discountPercent } = params;
    if (numKiosks <= 0) return 0;
    const firstKioskCost = totalSlots * baseRatePerSlot;
    const additionalKiosks = Math.max(0, numKiosks - 1);
    const discountedRate = baseRatePerSlot * (1 - (discountPercent || 0) / 100);
    const additionalCost = totalSlots * discountedRate * additionalKiosks;
    const total = firstKioskCost + additionalCost;
    return Math.round(total * 100) / 100;
  }

  // New method using volume discount service
  static async calculateCampaignPricingWithVolumeDiscounts(
    kiosks: Kiosk[],
    campaignId?: string
  ): Promise<CampaignPricing> {
    try {
      return await VolumeDiscountService.calculateCampaignPricing(kiosks, campaignId);
    } catch (error) {
      console.error('Error calculating campaign pricing with volume discounts:', error);
      throw error;
    }
  }

  // Calculate pricing for a single kiosk with volume discounts
  static async calculateKioskPricing(
    kiosk: Kiosk,
    kioskIndex: number,
    totalKiosks: number
  ): Promise<{
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    discountReason: string;
  }> {
    try {
      const discountSettings = await VolumeDiscountService.getVolumeDiscountSettings();
      const calculation = VolumeDiscountService.calculateKioskDiscount(
        kiosk,
        kioskIndex,
        totalKiosks,
        discountSettings
      );

      return {
        basePrice: calculation.basePrice,
        discountAmount: calculation.discountAmount,
        finalPrice: calculation.finalPrice,
        discountReason: calculation.discountReason
      };
    } catch (error) {
      console.error('Error calculating kiosk pricing:', error);
      return {
        basePrice: kiosk.price,
        discountAmount: 0,
        finalPrice: kiosk.price,
        discountReason: ''
      };
    }
  }

  // Get pricing breakdown for a campaign
  static async getCampaignPricingBreakdown(campaignId: string): Promise<PricingCalculation | null> {
    try {
      const breakdown = await VolumeDiscountService.getCampaignPricingBreakdown(campaignId);
      
      if (breakdown.length === 0) return null;

      const kioskPricing = breakdown.map(item => ({
        kioskId: item.kiosk_id,
        kioskName: (item.kiosk as any)?.name || 'Unknown Kiosk',
        basePrice: item.base_price,
        discountAmount: item.discount_amount,
        finalPrice: item.final_price,
        discountReason: item.discount_reason || ''
      }));

      const totalBasePrice = kioskPricing.reduce((sum, kiosk) => sum + kiosk.basePrice, 0);
      const totalDiscountAmount = kioskPricing.reduce((sum, kiosk) => sum + kiosk.discountAmount, 0);
      const totalFinalPrice = kioskPricing.reduce((sum, kiosk) => sum + kiosk.finalPrice, 0);

      return {
        totalBasePrice,
        totalDiscountAmount,
        totalFinalPrice,
        kioskPricing
      };
    } catch (error) {
      console.error('Error getting campaign pricing breakdown:', error);
      return null;
    }
  }

  // Update campaign with calculated pricing
  static async updateCampaignPricing(
    campaignId: string,
    pricing: CampaignPricing
  ): Promise<boolean> {
    try {
      return await VolumeDiscountService.updateCampaignWithVolumeDiscount(campaignId, pricing);
    } catch (error) {
      console.error('Error updating campaign pricing:', error);
      return false;
    }
  }

  // Get volume discount summary for admin dashboard
  static async getVolumeDiscountSummary() {
    try {
      return await VolumeDiscountService.getVolumeDiscountSummary();
    } catch (error) {
      console.error('Error getting volume discount summary:', error);
      return {
        totalDiscountsGiven: 0,
        totalSavings: 0,
        averageDiscountPercentage: 0,
        mostUsedDiscount: null
      };
    }
  }

  // Validate pricing calculation
  static validatePricingCalculation(pricing: CampaignPricing): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (pricing.totalBasePrice <= 0) {
      errors.push('Total base price must be greater than 0');
    }

    if (pricing.totalDiscountAmount < 0) {
      errors.push('Total discount amount cannot be negative');
    }

    if (pricing.totalFinalPrice <= 0) {
      errors.push('Total final price must be greater than 0');
    }

    if (pricing.totalFinalPrice > pricing.totalBasePrice) {
      errors.push('Total final price cannot be greater than total base price');
    }

    if (pricing.kioskPricing.length === 0) {
      errors.push('At least one kiosk pricing is required');
    }

    // Validate individual kiosk pricing
    pricing.kioskPricing.forEach((kiosk, index) => {
      if (kiosk.basePrice <= 0) {
        errors.push(`Kiosk ${index + 1}: Base price must be greater than 0`);
      }

      if (kiosk.discountAmount < 0) {
        errors.push(`Kiosk ${index + 1}: Discount amount cannot be negative`);
      }

      if (kiosk.finalPrice <= 0) {
        errors.push(`Kiosk ${index + 1}: Final price must be greater than 0`);
      }

      if (kiosk.finalPrice > kiosk.basePrice) {
        errors.push(`Kiosk ${index + 1}: Final price cannot be greater than base price`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
