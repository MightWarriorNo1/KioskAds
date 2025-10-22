import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MapPin, Calendar, DollarSign, Upload, AlertTriangle } from 'lucide-react';
import { CampaignService } from '../../services/campaignService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { PricingService } from '../../services/pricingService';
import PurchaseModal from '../../components/client/PurchaseModal';
import { BillingService } from '../../services/billingService';

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

export default function HostReviewSubmitPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: CampaignData };
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const campaignData = location.state;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!campaignData) {
      navigate('/host/new-campaign');
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
    return null;
  }
  
  const kiosks = campaignData.kiosks && campaignData.kiosks.length ? campaignData.kiosks : (campaignData.kiosk ? [campaignData.kiosk] : []);
  const selectedWeeks = campaignData.selectedWeeks || [];
  console.log("Selec", selectedWeeks);
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
    navigate('/host/add-media-duration', { state: campaignData });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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
      const campaignName = `${kiosks.length > 1 ? `${kiosks[0]?.name} +${kiosks.length - 1}` : kiosks[0]?.name} - ${selectedWeeks.length} week${selectedWeeks.length > 1 ? 's' : ''} campaign`;
      const startDate = selectedWeeks[0]?.startDate;
      const endDate = selectedWeeks[selectedWeeks.length - 1]?.endDate;
      if (!startDate || !endDate) {
        throw new Error('Invalid campaign dates');
      }
      const totalCost = calculateTotalCost();
      const newCampaign = await CampaignService.createCampaign({
        name: campaignName,
        description: `Campaign for ${kiosks.map(k => k.name).join(', ')} running for ${selectedWeeks.length} week${selectedWeeks.length > 1 ? 's' : ''}`,
        start_date: startDate,
        end_date: endDate,
        budget: totalCost,
        total_slots: totalSlots,
        total_cost: totalCost,
        user_id: user.id,
        kiosk_ids: kiosks.map(k => k.id),
        target_locations: Array.from(new Set(kiosks.map(k => k.city).filter(Boolean))),
        media_asset_id: uploadedMediaAsset.id
      });
      if (!newCampaign) {
        throw new Error('Failed to create campaign - please try again');
      }
      try {
        await BillingService.createPaymentRecord({
          user_id: user.id,
          campaign_id: newCampaign.id,
          amount: totalCost,
          status: 'succeeded',
          description: `Campaign ${campaignName}`
        });
      } catch (e) {
        console.warn('Failed to record payment history', e);
      }
      addNotification('success', 'Campaign Created!', `Your campaign "${campaignName}" has been created successfully and is now pending approval.`);
      navigate('/host/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      let errorMessage = 'Failed to create campaign. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
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
    <div>
      {/* Steps */}
      <div className="mb-6 md:mb-8">
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
        </div>
      </div>

      <div className="mb-8">
        <button 
          onClick={handleBack}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Add Media & Duration</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
            <div className="font-semibold mb-4">Campaign Summary</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2"><MapPin className="h-4 w-4" /><span>{kiosks.map(k => k.name).join(', ')}</span></div>
              <div className="flex items-center space-x-2"><Calendar className="h-4 w-4" /><span>{selectedWeeks.length} week(s)</span></div>
              <div className="flex items-center space-x-2"><Calendar className="h-4 w-4" /><span>Start Date: {selectedWeeks[0]?.startDate ? selectedWeeks[0].startDate : 'N/A'}</span></div>
              <div className="flex items-center space-x-2"><Calendar className="h-4 w-4" /><span>End Date: {selectedWeeks[selectedWeeks.length - 1]?.endDate ? selectedWeeks[selectedWeeks.length - 1].endDate : 'N/A'}</span></div>
              <div className="flex items-center space-x-2"><DollarSign className="h-4 w-4" /><span>Base rate: {formatCurrency(baseRate)}</span></div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
            <div className="font-semibold mb-4">Uploaded Media</div>
            <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
              <Upload className="h-4 w-4" />
              <span>Asset ID: {uploadedMediaAsset?.id}</span>
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>All uploaded media is subject to review and must comply with platform guidelines.</span>
            </div>
          </div>
        </div>

        <div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
            <div className="font-semibold mb-4">Pricing</div>
            <div className="text-2xl font-bold">{formatCurrency(calculateTotalCost())}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Taxes included where applicable</div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold ${isSubmitting ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {hasPaid ? 'Create Campaign' : 'Pay & Create Campaign'}
            </button>
          </div>
        </div>
      </div>

      {isPaymentOpen && (
        <PurchaseModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          package={{
            id: 'host-campaign-payment',
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
            name: `${kiosks.length > 1 ? `${kiosks[0]?.name} +${kiosks.length - 1}` : kiosks[0]?.name} - ${selectedWeeks.length} week${selectedWeeks.length > 1 ? 's' : ''} campaign`,
            description: `Campaign for ${kiosks.map(k => k.name).join(', ')} running for ${selectedWeeks.length} week${selectedWeeks.length > 1 ? 's' : ''}`,
            startDate: selectedWeeks[0]?.startDate || '',
            endDate: selectedWeeks[selectedWeeks.length - 1]?.endDate || '',
            kiosks: kiosks.map(k => ({ id: k.id, name: k.name })),
            totalSlots: totalSlots,
            totalCost: Number(calculateTotalCost().toFixed(2)),
            assetUrl: uploadedMediaAsset?.metadata?.publicUrl,
            assetType: uploadedMediaAsset?.file_type === 'image' ? 'image' : 'video'
          }}
          onPurchase={async () => {
            setHasPaid(true);
            setIsPaymentOpen(false);
            await createCampaignAfterPayment();
          }}
        />
      )}
    </div>
  );
}


