import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Calendar, DollarSign, Upload, AlertTriangle, Ticket, X, Repeat } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { CampaignService } from '../services/campaignService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { PricingService } from '../services/pricingService';
import PurchaseModal from '../components/client/PurchaseModal';
import { BillingService } from '../services/billingService';
import { CouponService, CouponValidationResult } from '../services/couponService';
import { supabase } from '../lib/supabaseClient';

interface SelectedWeek {
  startDate: string;
  endDate: string;
  slots: number;
}

interface CampaignData {
  kiosk: any;
  kiosks?: any[];
  selectedWeeks: SelectedWeek[];
  totalSlots: number;
  baseRate: number;
  subscriptionDuration?: number; // Custom number of months
  mediaFile?: File;
  slotsPerWeek?: number;
  uploadedMediaAsset?: any;
  selectedCustomAd?: any;
}

export default function ReviewSubmitPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: CampaignData };
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const campaignData = location.state;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [enableMonthlySubscription, setEnableMonthlySubscription] = useState(false);
  
  // Redirect if no campaign data or user not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!campaignData) {
      navigate('/client/new-campaign');
      return;
    }
  }, [campaignData, user, navigate]);

  React.useEffect(() => {
    (async () => {
      const percent = await PricingService.getAdditionalKioskDiscountPercent();
      setDiscountPercent(percent);
    })();
  }, []);
  
  if (!campaignData || !user) {
    return null; // Will redirect
  }
  
  const kiosks = campaignData.kiosks && campaignData.kiosks.length ? campaignData.kiosks : (campaignData.kiosk ? [campaignData.kiosk] : []);
  const selectedWeeks = campaignData.selectedWeeks || [];
  const totalSlots = campaignData.totalSlots || 1;
  const baseRate = campaignData.baseRate || 40.00;
  const subscriptionDuration = campaignData.subscriptionDuration || 1; // Default to 1 month if not provided
  const uploadedMediaAsset = campaignData.uploadedMediaAsset;
  const selectedCustomAd = campaignData.selectedCustomAd;

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Select Subscription', current: false, completed: true },
    { number: 4, name: 'Add Media & Duration', current: false, completed: true },
    { number: 5, name: 'Review & Submit', current: true, completed: false }
  ];

  const handleBack = () => {
    navigate('/client/add-media-duration', { state: campaignData });
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateBaseCost = () => {
    const numKiosks = kiosks.length || 1;
    // Calculate base cost: slots * rate * duration
    const baseCost = totalSlots * baseRate * subscriptionDuration;
    
    // No subscription duration discount applied
    const costAfterDurationDiscount = baseCost;
    
    // Apply additional kiosk discount if multiple kiosks
    if (numKiosks > 1) {
      const firstKioskCost = totalSlots * baseRate * subscriptionDuration;
      const additionalKiosks = numKiosks - 1;
      const discountedRate = baseRate * (1 - (discountPercent || 0) / 100);
      const additionalCost = totalSlots * discountedRate * subscriptionDuration * (1 - durationDiscount) * additionalKiosks;
      return Math.round((firstKioskCost + additionalCost) * 100) / 100;
    }
    
    return Math.round(costAfterDurationDiscount * 100) / 100;
  };

  const calculateTotalCost = () => {
    const baseCost = calculateBaseCost();
    // Apply coupon discount if valid
    if (couponValidation?.valid && couponValidation.coupon) {
      return couponValidation.coupon.finalAmount;
    }
    return baseCost;
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !user) return;
    
    setValidatingCoupon(true);
    setCouponValidation(null);
    
    try {
      const baseCost = calculateBaseCost();
      const validation = await CouponService.validateCoupon(couponCode.trim(), {
        userId: user.id,
        userRole: user.role,
        amount: baseCost,
        kioskIds: kiosks.map(k => k.id),
        campaignType: 'campaign'
      });
      
      setCouponValidation(validation);
      
      if (validation.valid && validation.coupon) {
        setAppliedCouponId(validation.coupon.id);
        addNotification('success', 'Coupon Applied', `Discount of ${formatCurrency(validation.coupon.discountAmount)} applied!`);
      } else {
        setAppliedCouponId(null);
        addNotification('error', 'Invalid Coupon', validation.error || 'This coupon code is not valid');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      addNotification('error', 'Error', 'Failed to validate coupon code');
      setCouponValidation(null);
      setAppliedCouponId(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponValidation(null);
    setAppliedCouponId(null);
  };

  const createCampaignAfterPayment = async () => {
    if (!user || (!uploadedMediaAsset && !selectedCustomAd)) return;
    setIsSubmitting(true);
    try {
      const startDate = selectedWeeks[0]?.startDate;
      const endDate = selectedWeeks[selectedWeeks.length - 1]?.endDate;
      if (!startDate || !endDate) {
        throw new Error('Invalid campaign dates');
      }
      // Calculate months from date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const campaignName = `${kiosks.length > 1 ? `${kiosks[0]?.name} +${kiosks.length - 1}` : kiosks[0]?.name} - ${months} month${months > 1 ? 's' : ''} campaign`;
      const totalCost = calculateTotalCost();
      const newCampaign = await CampaignService.createCampaign({
        name: campaignName,
        description: `Campaign for ${kiosks.map(k => k.name).join(', ')} running for ${months} month${months > 1 ? 's' : ''}`,
        start_date: startDate,
        end_date: endDate,
        budget: totalCost,
        total_slots: totalSlots,
        total_cost: totalCost,
        user_id: user.id,
        kiosk_ids: kiosks.map(k => k.id),
        target_locations: Array.from(new Set(kiosks.map(k => k.city).filter(Boolean))),
        media_asset_id: uploadedMediaAsset?.id,
        custom_ad_id: selectedCustomAd?.id
      });
      if (!newCampaign) {
        throw new Error('Failed to create campaign - please try again');
      }
      
      // Apply coupon if one was used
      if (appliedCouponId && couponValidation?.valid && couponValidation.coupon) {
        try {
          await CouponService.applyCoupon(
            appliedCouponId,
            user.id,
            newCampaign.id,
            couponValidation.coupon.discountAmount
          );
        } catch (e) {
          console.warn('Failed to record coupon usage:', e);
          // Non-blocking - campaign is created, coupon usage can be recorded later
        }
      }
      
      // Record payment history as succeeded
      try {
        await BillingService.createPaymentRecord({
          user_id: user.id,
          campaign_id: newCampaign.id,
          amount: totalCost,
          status: 'succeeded',
          description: `Campaign ${campaignName}${appliedCouponId ? ` (Coupon: ${couponCode})` : ''}`
        });
      } catch (e) {
        // Non-blocking
        console.warn('Failed to record payment history', e);
      }
      
      // Create monthly subscription if enabled
      if (enableMonthlySubscription) {
        try {
          const subscription = await BillingService.createSubscription(user.id, {
            auto_renewal: true,
            start_date: startDate,
            end_date: endDate
          });
          
          if (subscription) {
            // Link subscription to campaign
            const { error: linkError } = await supabase
              .from('subscription_campaigns')
              .insert([{
                subscription_id: subscription.id,
                campaign_id: newCampaign.id
              }]);
            
            if (linkError) {
              console.warn('Failed to link subscription to campaign:', linkError);
            }
          }
        } catch (e) {
          console.warn('Failed to create monthly subscription:', e);
          // Non-blocking - campaign is created, subscription can be set up later
        }
      }
      
      addNotification('success', 'Campaign Created!', `Your campaign "${campaignName}" has been created successfully${enableMonthlySubscription ? ' with monthly auto-renewal enabled' : ''} and is now pending approval.`);
      navigate('/client/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      let errorMessage = 'Failed to create campaign. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Permission denied - please contact support if this persists';
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied - please try again';
        } else {
          errorMessage = error.message;
        }
      }
      addNotification('error', 'Campaign Creation Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || (!uploadedMediaAsset && !selectedCustomAd)) return;
    if (!hasPaid) {
      setIsPaymentOpen(true);
      return;
    }
    await createCampaignAfterPayment();
  };

  return (
    <DashboardLayout 
      title="Create New Campaign" 
      subtitle=""
      showBreadcrumb={false}
    >
      {/* Progress Steps */}
      <div className="mb-6 md:mb-8">
        {/* Mobile Progress - Vertical Stack */}
        <div className="block md:hidden">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
              steps[4].current 
                ? 'bg-black text-white' 
                : steps[4].completed
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {steps[4].completed ? '✓' : steps[4].number}
            </div>
            <span className={`text-sm font-medium ${
              steps[4].current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {steps[4].name}
            </span>
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            Step 5 of {steps.length}
          </div>
        </div>
        
        {/* Desktop Progress - Horizontal */}
        <div className="hidden md:flex items-center space-x-4 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Add Media</span>
        </button>
      </div>

      {/* Section Title */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Submit Campaign
        </h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Please review all the details below before submitting your campaign for approval.
        </p>
      </div>

      {/* Review Content */}
      <div className="space-y-6 md:space-y-8">
        {/* Kiosk Selection Review */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Selected Kiosk{ kiosks.length > 1 ? 's' : '' }</h3>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
            {kiosks.length <= 1 ? (
              <div className="flex flex-col space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{kiosks[0]?.name}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mt-1">{kiosks[0]?.city}</p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs md:text-sm">{kiosks[0]?.address}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {kiosks.map((k) => (
                  <span key={k.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                    {k.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Weeks Review */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Subscription Period</h3>
          </div>
          <div className="space-y-3">
            {selectedWeeks.map((week, index) => {
              const start = new Date(week.startDate);
              const end = new Date(week.endDate);
              const formattedStart = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const formattedEnd = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              return (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">
                        {formattedStart} - {formattedEnd}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''} subscription
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                        {week.slots} slot{week.slots > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(week.slots * baseRate * subscriptionDuration)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Media Asset Review */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Upload className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Media Asset</h3>
          </div>
          {(uploadedMediaAsset || selectedCustomAd) && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  {selectedCustomAd ? (
                    // Custom Ad Preview
                    selectedCustomAd.type === 'image' ? (
                      <img 
                        src={selectedCustomAd.url} 
                        alt="Custom ad preview" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">
                        <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                    )
                  ) : uploadedMediaAsset.file_type === 'image' ? (
                    <img 
                      src={uploadedMediaAsset.metadata?.publicUrl} 
                      alt="Media preview" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">
                    {selectedCustomAd ? (selectedCustomAd.fileName || selectedCustomAd.title) : uploadedMediaAsset.file_name}
                  </h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {selectedCustomAd ? (
                      `${selectedCustomAd.type === 'video' ? 'Video' : 'Image'} • Custom Ad`
                    ) : (
                      `${uploadedMediaAsset.file_type === 'image' ? 'Image' : 'Video'} • ${uploadedMediaAsset.dimensions?.width}x${uploadedMediaAsset.dimensions?.height}${uploadedMediaAsset.duration ? ` • ${Math.round(uploadedMediaAsset.duration)}s` : ''}`
                    )}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    <span className="text-xs md:text-sm text-green-600 dark:text-green-400">Approved</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Cost Summary</h3>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Base rate per slot:</span>
                <span className="font-medium text-gray-900 dark:text-white text-xs md:text-sm">{formatCurrency(baseRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Duration:</span>
                <span className="font-medium text-gray-900 dark:text-white text-xs md:text-sm">
                  {subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''}
                </span>
              </div>
              {subscriptionDuration > 1 && (
                <div className="flex justify-between items-center text-green-700 dark:text-green-300">
                  <span className="text-xs md:text-sm">Subscription Discount:</span>
                  <span className="font-medium text-xs md:text-sm">
                    No discount
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Number of kiosks:</span>
                <span className="font-medium text-gray-900 dark:text-white text-xs md:text-sm">{kiosks.length}</span>
              </div>
              {kiosks.length > 1 && (
                <div className="flex justify-between items-center text-green-700 dark:text-green-300">
                  <span className="text-xs md:text-sm">Discount on each additional kiosk:</span>
                  <span className="font-medium text-xs md:text-sm">{discountPercent}%</span>
                </div>
              )}
              {/* Coupon Code Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Have a coupon code?</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleValidateCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={validatingCoupon || !!appliedCouponId}
                    />
                    {appliedCouponId ? (
                      <button
                        onClick={handleRemoveCoupon}
                        className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-1"
                      >
                        <X className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleValidateCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      >
                        <Ticket className="h-4 w-4" />
                        <span>{validatingCoupon ? 'Validating...' : 'Apply'}</span>
                      </button>
                    )}
                  </div>
                  {couponValidation?.valid && couponValidation.coupon && (
                    <div className="flex justify-between items-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <span className="text-xs md:text-sm flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Coupon Applied: {couponValidation.coupon.code}</span>
                      </span>
                      <span className="font-medium text-xs md:text-sm">-{formatCurrency(couponValidation.coupon.discountAmount)}</span>
                    </div>
                  )}
                  {couponValidation && !couponValidation.valid && (
                    <div className="text-xs text-red-600 dark:text-red-400">{couponValidation.error}</div>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                {/* Monthly Subscription Option */}
                <div className="mb-3">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={enableMonthlySubscription}
                      onChange={(e) => setEnableMonthlySubscription(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                          Enable Monthly Auto-Renewal
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Your campaign will automatically renew monthly at the same rate. You can cancel anytime.
                      </p>
                    </div>
                  </label>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Total Cost:</span>
                  <span className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(calculateTotalCost())}
                  </span>
                </div>
                {enableMonthlySubscription && (
                  <div className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Monthly:</span> {formatCurrency(calculateTotalCost() / subscriptionDuration)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm md:text-base">
                Important Notice
              </h4>
              <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
                Your campaign will be submitted for approval. Once approved, it will be scheduled to run for the selected month. 
                You will be notified via email when your campaign is approved and goes live.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-6 md:mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`group relative px-4 md:px-8 py-3 md:py-4 rounded-xl font-semibold text-sm md:text-lg transition-all duration-200 shadow-soft ${
            isSubmitting
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Campaign...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
              <span>Submit Campaign</span>
            </div>
          )}
        </button>
      </div>
      {/* Payment Modal */}
      <PurchaseModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        package={{
          id: 'campaign-payment',
          title: 'Campaign Payment',
          description: 'Pay to submit your campaign for review',
          price: Number(calculateTotalCost().toFixed(2)),
          couponCode: appliedCouponId ? couponCode : undefined,
          rating: 5,
          reviews: 0,
          thumbnail: 'https://dummyimage.com/256x256/ededed/aaa&text=Campaign',
          category: 'bundle',
          tags: ['Campaign', 'Submission', 'Payment'],
          deliveryTime: 'Instant'
        }}
        campaignDetails={{
          name: (() => {
            const start = new Date(selectedWeeks[0]?.startDate || '');
            const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate || '');
            const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
            return `${kiosks.length > 1 ? `${kiosks[0]?.name} +${kiosks.length - 1}` : kiosks[0]?.name} - ${months} month${months > 1 ? 's' : ''} campaign`;
          })(),
          description: (() => {
            const start = new Date(selectedWeeks[0]?.startDate || '');
            const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate || '');
            const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
            return `Campaign for ${kiosks.map(k => k.name).join(', ')} running for ${months} month${months > 1 ? 's' : ''}`;
          })(),
          startDate: selectedWeeks[0]?.startDate || '',
          endDate: selectedWeeks[selectedWeeks.length - 1]?.endDate || '',
          kiosks: kiosks.map(k => ({ id: k.id, name: k.name })),
          totalSlots: totalSlots,
          totalCost: Number(calculateTotalCost().toFixed(2)),
          assetUrl: uploadedMediaAsset?.metadata?.publicUrl,
          assetType: uploadedMediaAsset?.file_type === 'image' ? 'image' : 'video'
        }}
        onPurchase={() => {
          setHasPaid(true);
          setIsPaymentOpen(false);
          // Proceed to create campaign
          void createCampaignAfterPayment();
        }}
      />
    </DashboardLayout>
  );
}
