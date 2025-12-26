import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { BillingService, BillingCampaign, Subscription, PaymentHistory } from '../services/billingService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Active Campaigns');
  const [activeCampaigns, setActiveCampaigns] = useState<BillingCampaign[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = ['Active Campaigns', 'Subscriptions', 'Payment History'];

  const fetchBillingData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [campaigns, subs, payments] = await Promise.all([
        BillingService.getActiveCampaigns(user.id),
        BillingService.getSubscriptions(user.id),
        BillingService.getPaymentHistory(user.id)
      ]);
      
      setActiveCampaigns(campaigns);
      setSubscriptions(subs);
      setPaymentHistory(payments);

      // Fetch campaign names for linked campaigns
      const allCampaignIds = new Set<string>();
      subs.forEach(sub => {
        sub.linked_campaigns.forEach(campaignId => {
          allCampaignIds.add(campaignId);
        });
      });

      if (allCampaignIds.size > 0) {
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name')
          .in('id', Array.from(allCampaignIds));

        if (!campaignsError && campaignsData) {
          const namesMap: Record<string, string> = {};
          campaignsData.forEach(campaign => {
            namesMap[campaign.id] = campaign.name || `Campaign ${campaign.id.substring(0, 8)}`;
          });
          setCampaignNames(namesMap);
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBillingData();
    setRefreshing(false);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const success = await BillingService.cancelSubscription(subscriptionId);
      if (success) {
        // Refresh the data
        await fetchBillingData();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'succeeded':
        return 'bg-green-600';
      case 'pending':
        return 'bg-yellow-600';
      case 'cancelled':
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };


  const renderActiveCampaigns = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeCampaigns.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active campaigns</h3>
          <p className="text-gray-600">You don't have any active campaigns at the moment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {activeCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {campaign.name || `Campaign ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Active until {formatDate(campaign.end_date)}
                </p>
              </div>
              <span className={`${getStatusColor(campaign.status)} text-white text-xs px-2 py-1 rounded capitalize`}>
                {campaign.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <div>Start Date: {formatDate(campaign.start_date)}</div>
              <div>End Date: {formatDate(campaign.end_date)}</div>
              <div>Total Price: {formatCurrency(campaign.total_cost)}</div>
            </div>
            <button 
              onClick={() => navigate(`/client/campaigns/${campaign.id}`)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderSubscriptions = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (subscriptions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions</h3>
          <p className="text-gray-600">You don't have any active subscriptions at the moment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {subscription.auto_renewal ? 'Monthly (Recurring)' : 
                   subscription.end_date ? (() => {
                     const startDate = new Date(subscription.start_date);
                     const endDate = new Date(subscription.end_date);
                     const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                     const months = Math.round(diffDays / 30);
                     return months === 1 ? 'Monthly' : `${months}-Month`;
                   })() : 'Monthly'} Subscription
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Started: {formatDate(subscription.start_date)}</p>
              </div>
              <span className={`${getStatusColor(subscription.status)} text-white text-xs px-2 py-1 rounded capitalize`}>
                {subscription.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <div>Start Date: {formatDate(subscription.start_date)}</div>
              {subscription.end_date && <div>End Date: {formatDate(subscription.end_date)}</div>}
              <div>Status: {subscription.status}</div>
              <div>Auto-renewal: {subscription.auto_renewal ? 'Yes' : 'No'}</div>
            </div>
            {subscription.linked_campaigns.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Linked Campaigns</h4>
                {subscription.linked_campaigns.map((campaignId, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {campaignNames[campaignId] || `Campaign ${campaignId.substring(0, 8)}...`}
                    </span>
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">Active</span>
                  </div>
                ))}
                <div className="mt-2">
                  <button className="text-sm text-gray-600 dark:text-gray-300 underline hover:no-underline">
                    View details
                  </button>
                </div>
              </div>
            )}
            {subscription.status === 'active' && (
              <button 
                onClick={() => handleCancelSubscription(subscription.id)}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPaymentHistory = () => {
    if (loading) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          <p className="text-gray-600 mb-6">Your recent payment transactions.</p>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (paymentHistory.length === 0) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          <p className="text-gray-600 mb-6">Your recent payment transactions.</p>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
            <p className="text-gray-600">You don't have any payment transactions yet.</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <p className="text-gray-600 mb-6">Your recent payment transactions.</p>
        <div className="space-y-4">
          {paymentHistory.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{payment.description}</div>
                  <div className="text-sm text-gray-600">{formatDate(payment.payment_date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</div>
                  <span className={`${getStatusColor(payment.status)} text-white text-xs px-2 py-1 rounded-full capitalize`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Billing"
      subtitle="Manage your billing and payment information"
    >
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mb-8">
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:bg-gray-400 w-full sm:w-auto justify-center"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
        <button className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 w-full sm:w-auto justify-center">
          <FileText className="h-4 w-4" />
          <span>Manage Billing</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <div className="flex flex-wrap gap-1 sm:gap-0 sm:space-x-1 overflow-x-auto sm:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 dark:text-white hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'Active Campaigns' && renderActiveCampaigns()}
        {activeTab === 'Subscriptions' && renderSubscriptions()}
        {activeTab === 'Payment History' && renderPaymentHistory()}
      </div>
    </DashboardLayout>
  );
}
