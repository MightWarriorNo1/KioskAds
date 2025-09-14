import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Eye, Clock, Calendar, Download, Filter } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { AnalyticsService } from '../../services/analyticsService';
import { CampaignService } from '../../services/campaignService';
import { MediaService } from '../../services/mediaService';

interface AnalyticsMetrics {
  totalImpressions: number;
  averagePlayTime: number;
  campaignCTR: number;
  activeCampaigns: number;
}

interface TopPerformingAd {
  mediaId: string;
  mediaName: string;
  impressions: number;
  ctr: number;
  spend: number;
}

export default function Analytics() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalImpressions: 0,
    averagePlayTime: 0,
    campaignCTR: 0,
    activeCampaigns: 0
  });
  const [topPerformingAds, setTopPerformingAds] = useState<TopPerformingAd[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Fetch analytics data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchAnalyticsData(true); // Initial load
      fetchCampaigns();
    }
  }, [user]);

  // Fetch analytics data when time range or campaign changes
  useEffect(() => {
    if (user?.id && timeRange && selectedCampaign) {
      fetchAnalyticsData(false); // Subsequent loads
    }
  }, [timeRange, selectedCampaign]);

  const fetchAnalyticsData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      // Fetch user's campaigns
      const userCampaigns = await CampaignService.getUserCampaigns(user!.id);
      const activeCampaigns = userCampaigns.filter(c => c.status === 'active');
      
      // Calculate total impressions across all campaigns
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalPlays = 0;
      let totalCompletions = 0;
      
      for (const campaign of userCampaigns) {
        try {
          const analytics = await AnalyticsService.getCampaignAnalytics(campaign.id);
          totalImpressions += analytics.impressions;
          totalClicks += analytics.clicks;
          totalPlays += analytics.plays;
          totalCompletions += analytics.completions;
        } catch (error) {
          console.warn(`Failed to fetch analytics for campaign ${campaign.id}:`, error);
        }
      }
      
      // Calculate metrics
      const campaignCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const averagePlayTime = totalPlays > 0 ? (totalCompletions / totalPlays) * 15 : 0; // Assuming 15s average video length
      
      setMetrics({
        totalImpressions,
        averagePlayTime,
        campaignCTR,
        activeCampaigns: activeCampaigns.length
      });
      
      // Fetch top performing ads
      await fetchTopPerformingAds();
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      addNotification('error', 'Analytics Error', 'Failed to load analytics data');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  const fetchCampaigns = async () => {
    try {
      const userCampaigns = await CampaignService.getUserCampaigns(user!.id);
      setCampaigns(userCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchTopPerformingAds = async () => {
    try {
      const userMedia = await MediaService.getUserMedia(user!.id);
      
      // Create mock performance data for now (in real app, this would come from analytics)
      const topAds: TopPerformingAd[] = userMedia.slice(0, 3).map((media, index) => ({
        mediaId: media.id,
        mediaName: media.file_name,
        impressions: Math.floor(Math.random() * 500000) + 100000,
        ctr: Math.random() * 5 + 1,
        spend: Math.floor(Math.random() * 1000) + 500
      }));
      
      // Sort by impressions
      topAds.sort((a, b) => b.impressions - a.impressions);
      setTopPerformingAds(topAds);
      
    } catch (error) {
      console.error('Error fetching top performing ads:', error);
    }
  };

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    addNotification('info', 'Time Range Updated', `Analytics data updated for ${newRange}`);
  };

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    if (campaignId !== 'all') {
      const campaign = campaigns.find(c => c.id === campaignId);
      addNotification('info', 'Campaign Selected', `Showing analytics for "${campaign?.name}"`);
    } else {
      addNotification('info', 'All Campaigns', 'Showing analytics for all campaigns');
    }
  };

  const handleMetricClick = (metricTitle: string) => {
    addNotification('info', 'Metric Details', `Detailed analytics for ${metricTitle} will be displayed`);
  };

  const handleAdClick = (adName: string) => {
    addNotification('info', 'Ad Details', `Detailed performance data for "${adName}" will be shown`);
  };

  const handleChartInteraction = (chartType: string) => {
    addNotification('info', 'Chart Interaction', `${chartType} chart interaction functionality will be implemented soon`);
  };

  const handleExportData = async () => {
    try {
      if (selectedCampaign === 'all') {
        addNotification('info', 'Export Started', 'Preparing export for all campaigns...');
      } else {
        const campaign = campaigns.find(c => c.id === selectedCampaign);
        addNotification('info', 'Export Started', `Preparing export for "${campaign?.name}"...`);
      }
      
      // In real app, this would export actual data
      setTimeout(() => {
        addNotification('success', 'Export Complete', 'Your analytics data has been exported successfully');
      }, 2000);
      
    } catch (error) {
      addNotification('error', 'Export Failed', 'Failed to export analytics data');
    }
  };

  const dashboardMetrics = [
    {
      title: 'Total Impressions',
      value: metrics.totalImpressions > 1000000 
        ? `${(metrics.totalImpressions / 1000000).toFixed(1)}M`
        : metrics.totalImpressions > 1000 
        ? `${(metrics.totalImpressions / 1000).toFixed(1)}K`
        : metrics.totalImpressions.toString(),
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: Eye
    },
    {
      title: 'Average Play Time',
      value: `${metrics.averagePlayTime.toFixed(1)}s`,
      change: '+2.1s',
      changeType: 'positive' as const,
      icon: Clock
    },
    {
      title: 'Campaign CTR',
      value: `${metrics.campaignCTR.toFixed(1)}%`,
      change: '+0.5%',
      changeType: 'positive' as const,
      icon: TrendingUp
    },
    {
      title: 'Active Campaigns',
      value: metrics.activeCampaigns.toString(),
      change: '+3',
      changeType: 'positive' as const,
      icon: BarChart3
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track your campaign performance and audience insights</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Campaign Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCampaign}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>
          
          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExportData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleMetricClick(metric.title)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                <p className={`text-sm mt-1 ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <metric.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Impressions Over Time</h3>
          <div 
            className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleChartInteraction('Impressions')}
          >
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Interactive line chart</p>
              <p className="text-sm text-gray-500 mt-1">Daily impressions and engagement</p>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Geographic Distribution</h3>
          <div 
            className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleChartInteraction('Geographic')}
          >
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Interactive map visualization</p>
              <p className="text-sm text-gray-500 mt-1">Kiosk locations and performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Ads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Ads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topPerformingAds.length > 0 ? (
                topPerformingAds.map((ad, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAdClick(ad.mediaName)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{ad.mediaName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ad.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ad.ctr.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${ad.spend}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No ads found. Upload some media to see performance data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}