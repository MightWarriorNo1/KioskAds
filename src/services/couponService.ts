import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed' | 'free';
    value: number;
    discountAmount: number;
    finalAmount: number;
  };
  error?: string;
}

export interface CouponApplicationContext {
  userId: string;
  userRole?: string;
  amount: number;
  kioskIds?: string[];
  campaignType?: 'campaign' | 'custom_ad';
  subscriptionTier?: string;
}

export class CouponService {
  /**
   * Validate and calculate discount for a coupon code
   */
  static async validateCoupon(
    code: string,
    context: CouponApplicationContext
  ): Promise<CouponValidationResult> {
    try {
      // Normalize code (uppercase, trim)
      const normalizedCode = code.trim().toUpperCase();

      // Get coupon with scopes
      const { data: coupon, error: couponError } = await supabase
        .from('coupon_codes')
        .select(`
          *,
          scopes:coupon_scopes(*)
        `)
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        return {
          valid: false,
          error: 'Invalid or inactive coupon code'
        };
      }

      // Check if coupon has reached max uses
      if (coupon.current_uses >= coupon.max_uses) {
        return {
          valid: false,
          error: 'This coupon has reached its maximum usage limit'
        };
      }

      // Check validity dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom) {
        return {
          valid: false,
          error: 'This coupon is not yet valid'
        };
      }

      if (now > validUntil) {
        return {
          valid: false,
          error: 'This coupon has expired'
        };
      }

      // Check minimum amount requirement
      if (coupon.min_amount && context.amount < coupon.min_amount) {
        return {
          valid: false,
          error: `Minimum purchase amount of $${coupon.min_amount.toFixed(2)} required`
        };
      }

      // Validate scopes
      if (coupon.scopes && coupon.scopes.length > 0) {
        const scopeValid = this.validateScopes(coupon.scopes, context);
        if (!scopeValid.valid) {
          return {
            valid: false,
            error: scopeValid.error || 'This coupon is not valid for your purchase'
          };
        }
      }

      // Check if user has already used this coupon
      const { data: existingUsage, error: usageError } = await supabase
        .from('coupon_usage')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', context.userId)
        .limit(1);

      if (usageError) {
        console.error('Error checking coupon usage:', usageError);
      }

      if (existingUsage && existingUsage.length > 0) {
        return {
          valid: false,
          error: 'You have already used this coupon code'
        };
      }

      // Calculate discount
      let discountAmount = 0;
      let finalAmount = context.amount;

      if (coupon.type === 'percentage') {
        discountAmount = (context.amount * coupon.value) / 100;
        finalAmount = Math.max(0, context.amount - discountAmount);
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, context.amount);
        finalAmount = Math.max(0, context.amount - discountAmount);
      } else if (coupon.type === 'free') {
        discountAmount = context.amount;
        finalAmount = 0;
      }

      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discountAmount: Math.round(discountAmount * 100) / 100,
          finalAmount: Math.round(finalAmount * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        valid: false,
        error: 'An error occurred while validating the coupon'
      };
    }
  }

  /**
   * Validate coupon scopes against context
   */
  private static validateScopes(
    scopes: Array<{ scope_type: string; scope_value: string }>,
    context: CouponApplicationContext
  ): { valid: boolean; error?: string } {
    for (const scope of scopes) {
      switch (scope.scope_type) {
        case 'role':
          if (context.userRole && context.userRole !== scope.scope_value) {
            return {
              valid: false,
              error: 'This coupon is not valid for your account type'
            };
          }
          break;

        case 'kiosk':
          if (context.kioskIds && !context.kioskIds.includes(scope.scope_value)) {
            return {
              valid: false,
              error: 'This coupon is not valid for the selected kiosk(s)'
            };
          }
          break;

        case 'product':
          if (context.campaignType && context.campaignType !== scope.scope_value) {
            return {
              valid: false,
              error: 'This coupon is not valid for this product type'
            };
          }
          break;

        case 'subscription_tier':
          if (context.subscriptionTier && context.subscriptionTier !== scope.scope_value) {
            return {
              valid: false,
              error: 'This coupon is not valid for your subscription tier'
            };
          }
          break;
      }
    }

    return { valid: true };
  }

  /**
   * Apply coupon and record usage after successful payment
   */
  static async applyCoupon(
    couponId: string,
    userId: string,
    campaignId: string | null,
    discountAmount: number
  ): Promise<boolean> {
    try {
      // Record coupon usage
      const { error: usageError } = await supabase
        .from('coupon_usage')
        .insert({
          coupon_id: couponId,
          user_id: userId,
          campaign_id: campaignId,
          discount_amount: discountAmount
        });

      if (usageError) {
        console.error('Error recording coupon usage:', usageError);
        return false;
      }

      // Increment coupon usage count
      // Try RPC first, fallback to manual update
      try {
        const { error: updateError } = await supabase.rpc('increment_coupon_uses', {
          coupon_id_param: couponId
        });

        if (updateError) {
          throw updateError; // Will be caught by catch block below
        }
      } catch (rpcError) {
        // Fallback: manual update if RPC doesn't exist
        const { data: coupon, error: fetchError } = await supabase
          .from('coupon_codes')
          .select('current_uses')
          .eq('id', couponId)
          .single();

        if (!fetchError && coupon) {
          const { error: updateError } = await supabase
            .from('coupon_codes')
            .update({ 
              current_uses: (coupon.current_uses || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', couponId);
          
          if (updateError) {
            console.error('Error updating coupon usage count:', updateError);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error applying coupon:', error);
      return false;
    }
  }
}

