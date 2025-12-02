import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Calendar, DollarSign, Upload, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { CampaignService } from '../services/campaignService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { PricingService } from '../services/pricingService';
import PurchaseModal from '../components/client/PurchaseModal';
import { BillingService } from '../services/billingService';

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
  const uploadedMediaAsset = campaignData.uploadedMediaAsset;
  const selectedCustomAd = campaignData.selectedCustomAd;

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Choose Weeks', current: false, completed: true },
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

  const calculateTotalCost = () => {
    const numKiosks = kiosks.length || 1;
    return PricingService.calculateCampaignCost({
      baseRatePerSlot: baseRate,
      totalSlots,
      numKiosks,
      discountPercent
    });
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
      // Record payment history as succeeded
      try {
        await BillingService.createPaymentRecord({
          user_id: user.id,
          campaign_id: newCampaign.id,
          amount: totalCost,
          status: 'succeeded',
          description: `Campaign ${campaignName}`
        });
      } catch (e) {
        // Non-blocking
        console.warn('Failed to record payment history', e);
      }
      addNotification('success', 'Campaign Created!', `Your campaign "${campaignName}" has been created successfully and is now pending approval.`);
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
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Selected Weeks</h3>
          </div>
          <div className="space-y-3">
            {selectedWeeks.map((week, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base">
                      Week {index + 1}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      {week.startDate} - {week.endDate}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                      {week.slots} slot{week.slots > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(week.slots * baseRate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
                  {selectedWeeks.length > 0 ? (() => {
                    const start = new Date(selectedWeeks[0]?.startDate);
                    const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate);
                    const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    return `${months} month${months > 1 ? 's' : ''}`;
                  })() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total slots:</span>
                <span className="font-medium text-gray-900 dark:text-white text-xs md:text-sm">{totalSlots}</span>
              </div>
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
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Total Cost:</span>
                  <span className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(calculateTotalCost())}
                  </span>
                </div>
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
