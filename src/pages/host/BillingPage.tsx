import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, RefreshCw, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostPayout, HostRevenue } from '../../services/hostService';
import { BillingService, BillingCampaign, Subscription, PaymentHistory } from '../../services/billingService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function HostBillingPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Revenue');
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [revenue, setRevenue] = useState<HostRevenue[]>([]);
  const [campaigns, setCampaigns] = useState<BillingCampaign[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = ['Revenue', 'Payouts', 'Campaigns', 'Payment History'];

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const fetchBillingData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [payoutsData, revenueData, campaignsData, subsData, paymentsData] = await Promise.all([
        HostService.getHostPayouts(user.id),
        HostService.getHostRevenue(user.id),
        BillingService.getActiveCampaigns(user.id),
        BillingService.getSubscriptions(user.id),
        BillingService.getPaymentHistory(user.id)
      ]);
      
      setPayouts(payoutsData);
      setRevenue(revenueData);
      setCampaigns(campaignsData);
      setSubscriptions(subsData);
      setPaymentHistory(paymentsData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      addNotification('error', 'Error', 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBillingData();
    setRefreshing(false);
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
      case 'completed':
      case 'succeeded':
        return 'bg-green-600';
      case 'pending':
      case 'processing':
        return 'bg-yellow-600';
      case 'cancelled':
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const renderRevenue = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (revenue.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No revenue data</h3>
          <p className="text-gray-600 dark:text-gray-300">You don't have any revenue data yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {revenue.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {item.kiosk.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {item.kiosk.location}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(item.revenue)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Commission: {formatCurrency(item.commission)}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <div>Date: {formatDate(item.date)}</div>
              <div>Impressions: {item.impressions.toLocaleString()}</div>
              <div>Clicks: {item.clicks.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPayouts = () => {
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
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (payouts.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payouts</h3>
          <p className="text-gray-600 dark:text-gray-300">You don't have any payouts yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {payouts.map((payout) => (
          <div key={payout.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Payout #{payout.id.slice(-8)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Period: {payout.period_start} - {formatDate(payout.period_end)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(payout.amount)}
                </div>
                <span className={`${getStatusColor(payout.status)} text-white text-xs px-2 py-1 rounded capitalize`}>
                  {payout.status}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <div>Method: {payout.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank Transfer'}</div>
              {payout.processed_at && <div>Processed: {formatDate(payout.processed_at)}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCampaigns = () => {
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
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No active campaigns</h3>
          <p className="text-gray-600 dark:text-gray-300">You don't have any active campaigns at the moment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 p-6">
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
              onClick={() => navigate(`/host/campaigns/${campaign.id}`)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderPaymentHistory = () => {
    if (loading) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Your recent payment transactions.</p>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4">
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Your recent payment transactions.</p>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payment history</h3>
            <p className="text-gray-600 dark:text-gray-300">You don't have any payment transactions yet.</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Your recent payment transactions.</p>
        <div className="space-y-4">
          {paymentHistory.map((payment) => (
            <div key={payment.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{payment.description}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{formatDate(payment.payment_date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</div>
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your revenue, payouts, and billing information</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mb-8">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:bg-gray-400 w-full sm:w-auto justify-center"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
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
          {activeTab === 'Revenue' && renderRevenue()}
          {activeTab === 'Payouts' && renderPayouts()}
          {activeTab === 'Campaigns' && renderCampaigns()}
          {activeTab === 'Payment History' && renderPaymentHistory()}
        </div>
      </div>
    </div>
  );
}


