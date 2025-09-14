import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Calendar, Download, TrendingUp, Clock, ExternalLink, Settings, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostPayout, HostPayoutStatement } from '../../services/hostService';
import { StripeConnectService } from '../../services/stripeConnectService';
import StripeConnectSetup from './StripeConnectSetup';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function PayoutHistory() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [payoutStats, setPayoutStats] = useState({
    totalPayouts: 0,
    totalAmount: 0,
    lastPayoutDate: '',
    nextPayoutDate: ''
  });
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [stripeConnectEnabled, setStripeConnectEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<HostPayout | null>(null);
  const [payoutStatements, setPayoutStatements] = useState<HostPayoutStatement[]>([]);

  useEffect(() => {
    const loadPayoutData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        const [payoutsData, profileData, statsData, stripeEnabled] = await Promise.all([
          HostService.getHostPayouts(user.id),
          HostService.getHostProfile(user.id),
          StripeConnectService.getPayoutStats(user.id),
          StripeConnectService.isStripeConnectEnabled(user.id)
        ]);

        setPayouts(payoutsData);
        setHostProfile(profileData);
        setPayoutStats(statsData);
        setStripeConnectEnabled(stripeEnabled);
      } catch (error) {
        console.error('Error loading payout data:', error);
        addNotification('error', 'Error', 'Failed to load payout data');
      } finally {
        setLoading(false);
      }
    };

    loadPayoutData();
  }, [user?.id]);

  // Handle Stripe Connect setup completion
  useEffect(() => {
    const setupComplete = searchParams.get('setup');
    if (setupComplete === 'complete') {
      addNotification('success', 'Setup Complete', 'Stripe Connect has been set up successfully!');
      // Remove the query parameter from URL
      setSearchParams({});
      // Refresh the data to show updated status
      const loadPayoutData = async () => {
        if (!user?.id) return;
        
        try {
          const [payoutsData, profileData, statsData, stripeEnabled] = await Promise.all([
            HostService.getHostPayouts(user.id),
            HostService.getHostProfile(user.id),
            StripeConnectService.getPayoutStats(user.id),
            StripeConnectService.isStripeConnectEnabled(user.id)
          ]);

          setPayouts(payoutsData);
          setHostProfile(profileData);
          setPayoutStats(statsData);
          setStripeConnectEnabled(stripeEnabled);
        } catch (error) {
          console.error('Error refreshing payout data:', error);
        }
      };
      loadPayoutData();
    }
  }, [searchParams, setSearchParams, addNotification, user?.id]);

  const handleUpdatePayoutSettings = async (settings: { payout_frequency?: string; minimum_payout?: number }) => {
    if (!user?.id) return;
    
    try {
      // Optimistically update local state to avoid reload/flash
      setHostProfile((prev: any) => ({ ...(prev || {}), ...settings }));
      await HostService.updatePayoutSettings(user.id, settings);
      addNotification('success', 'Settings Updated', 'Payout settings have been updated');
      
      // Optionally refresh in background to ensure consistency
      HostService.getHostProfile(user.id).then((profileData) => {
        setHostProfile(profileData);
      }).catch(() => {
        // Ignore background refresh errors
      });
    } catch (error) {
      console.error('Error updating payout settings:', error);
      addNotification('error', 'Update Failed', 'Failed to update payout settings');
    }
  };

  const handleDownloadReceipt = (payout: HostPayout) => {
    try {
      // Generate receipt data
      const receiptData = {
        payoutId: payout.id,
        amount: payout.amount,
        date: payout.processed_at || payout.created_at,
        method: payout.payout_method,
        period: `${payout.period_start} to ${payout.period_end}`,
        status: payout.status
      };

      // Create and download receipt
      const receiptContent = `
PAYOUT RECEIPT
==============

Payout ID: ${receiptData.payoutId}
Amount: $${receiptData.amount.toFixed(2)}
Date: ${new Date(receiptData.date).toLocaleDateString()}
Method: ${receiptData.method}
Period: ${receiptData.period}
Status: ${receiptData.status}

Thank you for using EZ Kiosk Ads!
      `.trim();

      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payout-receipt-${payout.id}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      addNotification('success', 'Receipt Downloaded', `Receipt for payout ${payout.id} has been downloaded`);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      addNotification('error', 'Download Failed', 'Failed to download receipt. Please try again.');
    }
  };

  const handleViewPayoutDetails = async (payout: HostPayout) => {
    try {
      const statements = await HostService.getPayoutStatements(payout.id);
      setPayoutStatements(statements);
      setSelectedPayout(payout);
    } catch (error) {
      console.error('Error loading payout statements:', error);
      addNotification('error', 'Error', 'Failed to load payout details');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Settings className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payout History</h1>
          <p className="mt-2">Loading payout data...</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payout History</h1>
        <p className="mt-2">Track your earnings and payment history</p>
      </div>

      {/* Stripe Connect Setup */}
      <StripeConnectSetup onSetupComplete={() => {
        // Refresh the data when setup is complete
        const loadPayoutData = async () => {
          if (!user?.id) return;
          
          try {
            const [payoutsData, profileData, statsData, stripeEnabled] = await Promise.all([
              HostService.getHostPayouts(user.id),
              HostService.getHostProfile(user.id),
              StripeConnectService.getPayoutStats(user.id),
              StripeConnectService.isStripeConnectEnabled(user.id)
            ]);

            setPayouts(payoutsData);
            setHostProfile(profileData);
            setPayoutStats(statsData);
            setStripeConnectEnabled(stripeEnabled);
          } catch (error) {
            console.error('Error loading payout data:', error);
            addNotification('error', 'Error', 'Failed to load payout data');
          }
        };
        loadPayoutData();
      }} />

      {/* Payout Summary */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${payoutStats.totalAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payouts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {payoutStats.totalPayouts}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Payout</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {payoutStats.lastPayoutDate ? new Date(payoutStats.lastPayoutDate).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Next Payout</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {payoutStats.nextPayoutDate ? new Date(payoutStats.nextPayoutDate).toLocaleDateString() : 'TBD'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payout Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payout Settings</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payout Frequency</label>
            <select 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              value={hostProfile?.payout_frequency || 'weekly'}
              onChange={(e) => handleUpdatePayoutSettings({ payout_frequency: e.target.value })}
            >
              <option value="weekly">Weekly (Fridays)</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minimum Payout</label>
            <select 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              value={hostProfile?.minimum_payout || 100}
              onChange={(e) => handleUpdatePayoutSettings({ minimum_payout: parseFloat(e.target.value) })}
            >
              <option value={50}>$50</option>
              <option value={100}>$100</option>
              <option value={250}>$250</option>
              <option value={500}>$500</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payout History Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Payouts</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {new Date(payout.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    ${payout.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {payout.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank Transfer'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                      {getStatusIcon(payout.status)}
                      <span className="ml-1">{payout.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewPayoutDetails(payout)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payout)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payout Details Modal */}
      {selectedPayout && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payout Details</h3>
              <p className="text-gray-600 dark:text-gray-400">Payout ID: {selectedPayout.id}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedPayout(null)}>
              Close
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Payout Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="text-sm font-medium">${selectedPayout.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(selectedPayout.status)}`}>
                    {selectedPayout.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Method:</span>
                  <span className="text-sm font-medium">
                    {selectedPayout.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Bank Transfer'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedPayout.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedPayout.processed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Processed:</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedPayout.processed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Period Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Start Date:</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedPayout.period_start).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">End Date:</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedPayout.period_end).toLocaleDateString()}
                  </span>
                </div>
                {selectedPayout.stripe_transfer_id && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Transfer ID:</span>
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {selectedPayout.stripe_transfer_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payout Statements */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Revenue Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kiosk</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Impressions</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Clicks</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {payoutStatements.map((statement) => (
                    <tr key={statement.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{statement.kiosk.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{statement.impressions.toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{statement.clicks.toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">${statement.revenue.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-green-600 dark:text-green-400">${statement.commission_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}