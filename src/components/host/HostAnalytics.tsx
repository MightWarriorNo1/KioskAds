import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { CampaignService, Campaign } from '../../services/campaignService';
import { MediaService } from '../../services/mediaService';

interface CampaignAnalytics {
  campaign: Campaign;
  numberOfAds: number;
  impressionsPerDay: number;
  impressionsForRange: number;
}

export default function HostAnalytics() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics[]>([]);

  // Fetch analytics data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchAnalyticsData(true); // Initial load
    }
  }, [user]);

  // Fetch analytics data when time range changes
  useEffect(() => {
    if (user?.id && timeRange) {
      fetchAnalyticsData(false); // Subsequent loads
    }
  }, [timeRange]);

  const fetchAnalyticsData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      if (!user?.id) return;

      // Fetch campaigns for the host user
      const campaigns = await CampaignService.getUserCampaigns(user.id);
      
      // Filter for active campaigns only
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      
      // Get media assets count for each campaign and calculate impressions
      const analyticsData: CampaignAnalytics[] = await Promise.all(
        activeCampaigns.map(async (campaign) => {
          try {
            // Get media assets for this campaign
            const mediaAssets = await MediaService.getCampaignAssets(campaign.id);
            const numberOfAds = mediaAssets.length;
            
            // Calculate impressions per day: 288 impressions per ad per day (1440 minutes / 5 minutes)
            const impressionsPerDay = calculateEstimatedImpressionsPerDay(numberOfAds);
            
            // Calculate impressions for the selected time range
            const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const impressionsForRange = impressionsPerDay * days;
            
            return {
              campaign,
              numberOfAds,
              impressionsPerDay,
              impressionsForRange
            };
          } catch (error) {
            console.error(`Error fetching assets for campaign ${campaign.id}:`, error);
            return {
              campaign,
              numberOfAds: 0,
              impressionsPerDay: 0,
              impressionsForRange: 0
            };
          }
        })
      );
      
      setCampaignAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      addNotification('error', 'Analytics Error', 'Failed to load analytics data');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    // Refetch data with new time range
    fetchAnalyticsData(false);
    addNotification('info', 'Time Range Updated', `Analytics data updated for ${newRange}`);
  };

  const handleRefreshData = async () => {
    await fetchAnalyticsData(false);
    addNotification('success', 'Data Refreshed', 'Analytics data has been refreshed');
  };

  // Calculate estimated impressions per day
  // Every ad runs every 5 minutes, so in 24 hours (1440 minutes) = 1440 / 5 = 288 impressions per day per ad
  const calculateEstimatedImpressionsPerDay = (numberOfAds: number): number => {
    const minutesPerDay = 24 * 60; // 1440 minutes
    const adIntervalMinutes = 5; // Every 5 minutes
    const impressionsPerAdPerDay = minutesPerDay / adIntervalMinutes; // 288 impressions per ad per day
    return numberOfAds * impressionsPerAdPerDay;
  };

  // Calculate totals
  const totalImpressionsPerDay = campaignAnalytics.reduce((sum, item) => sum + item.impressionsPerDay, 0);
  const totalImpressionsForRange = campaignAnalytics.reduce((sum, item) => sum + item.impressionsForRange, 0);
  const totalNumberOfAds = campaignAnalytics.reduce((sum, item) => sum + item.numberOfAds, 0);
  const totalCampaigns = campaignAnalytics.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Expected impressions based on active campaigns (5-minute intervals)</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Buttons */}
          <div className="flex items-center space-x-2">
            {['1d', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {range === '1d' ? '1 Day' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefreshData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Analytics Summary - {timeRange === '1d' ? '1 Day' : timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Expected impressions based on active campaigns. Each ad runs every 5 minutes (288 impressions per ad per day).
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalCampaigns}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalNumberOfAds.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Ads</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalImpressionsPerDay.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Impressions/Day</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">(Based on 5-min intervals)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{totalImpressionsForRange.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Impressions ({timeRange === '1d' ? '1 Day' : timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days'})</div>
          </div>
        </div>
      </div>

      {/* Campaign Analytics Cards */}
      {campaignAnalytics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignAnalytics.map((item) => (
            <div key={item.campaign.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.campaign.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {item.campaign.start_date} - {item.campaign.end_date}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Number of Ads:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.numberOfAds}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Impressions/Day:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.impressionsPerDay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Impressions ({timeRange === '1d' ? '1 Day' : timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days'}):</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{item.impressionsForRange.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 text-lg">No active campaigns found</div>
          <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Start a campaign to see expected impressions analytics.
            <br />
            Each ad in your campaign will run every 5 minutes, generating 288 impressions per day per ad.
          </div>
        </div>
      )}
    </div>
  );
}
