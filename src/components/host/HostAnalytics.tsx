import { useState, useEffect } from 'react';
import { Upload, Eye, DollarSign, Calendar, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MediaService } from '../../services/mediaService';
import { HostService } from '../../services/hostService';
import { CampaignService } from '../../services/campaignService';
import { AnalyticsService } from '../../services/analyticsService';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import AssetProofOfPlayWidget from '../shared/AssetProofOfPlayWidget';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  hostKioskAds: {
    totalAds: number;
    activeAds: number;
    totalAssignments: number;
    activeAssignments: number;
  };
  campaignAds: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpent: number;
    totalImpressions: number;
  };
  kioskPerformance: Array<{
    kioskId: string;
    kioskName: string;
    location: string;
    totalPlays: number;
    totalImpressions: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    type: 'host_ad' | 'campaign';
    name: string;
    status: string;
    timestamp: string;
  }>;
}

export default function HostAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userAssets, setUserAssets] = useState<Array<{id: string; file_name: string; file_type: string}>>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Load user assets
        const assets = await MediaService.getUserMedia(user.id);
        setUserAssets(assets.map(asset => ({
          id: asset.id,
          file_name: asset.file_name,
          file_type: asset.file_type
        })));

        // Load host kiosk ads data
        const [hostAds, hostAssignments, hostKiosks, userCampaigns] = await Promise.all([
          HostService.getHostAds(user.id),
          HostService.getHostAdAssignments(user.id),
          HostService.getHostKiosks(user.id),
          CampaignService.getUserCampaigns(user.id)
        ]);

        // Calculate host kiosk ads metrics
        const hostKioskAdsMetrics = {
          totalAds: hostAds.length,
          activeAds: hostAds.filter(ad => ad.status === 'active').length,
          totalAssignments: hostAssignments.length,
          activeAssignments: hostAssignments.filter(assignment => assignment.status === 'active').length
        };

        // Calculate campaign ads metrics
        const activeCampaigns = userCampaigns.filter(c => c.status === 'active');
        const totalSpent = userCampaigns.reduce((sum, c) => sum + (c.total_cost || 0), 0);
        
        // Get analytics for campaigns
        let totalImpressions = 0;
        for (const campaign of userCampaigns) {
          try {
            const analytics = await AnalyticsService.getCampaignAnalytics(campaign.id);
            totalImpressions += analytics.impressions;
          } catch (error) {
            console.warn(`Failed to fetch analytics for campaign ${campaign.id}:`, error);
          }
        }

        const campaignAdsMetrics = {
          totalCampaigns: userCampaigns.length,
          activeCampaigns: activeCampaigns.length,
          totalSpent,
          totalImpressions
        };

        // Calculate kiosk performance
        const kioskPerformance = await Promise.all(
          hostKiosks.map(async (hostKiosk) => {
            const kiosk = hostKiosk.kiosk;
            // Get proof of play data for this kiosk
            try {
              const popData = await AnalyticsService.getCSVAnalyticsSummary(user.id);
              return {
                kioskId: kiosk.id,
                kioskName: kiosk.name,
                location: `${kiosk.city}, ${kiosk.state}`,
                totalPlays: popData.total_plays || 0,
                totalImpressions: popData.total_impressions || 0,
                revenue: 0 // This would need to be calculated from revenue data
              };
            } catch (error) {
              return {
                kioskId: kiosk.id,
                kioskName: kiosk.name,
                location: `${kiosk.city}, ${kiosk.state}`,
                totalPlays: 0,
                totalImpressions: 0,
                revenue: 0
              };
            }
          })
        );

        // Get recent activity
        const recentActivity = [
          ...hostAds.slice(0, 3).map(ad => ({
            type: 'host_ad' as const,
            name: ad.name,
            status: ad.status,
            timestamp: ad.created_at
          })),
          ...userCampaigns.slice(0, 3).map(campaign => ({
            type: 'campaign' as const,
            name: campaign.name,
            status: campaign.status,
            timestamp: campaign.created_at
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

        setAnalyticsData({
          hostKioskAds: hostKioskAdsMetrics,
          campaignAds: campaignAdsMetrics,
          kioskPerformance,
          recentActivity
        });

      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [user?.id, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading your analytics dashboard...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Comprehensive analytics for Host Kiosk Ads and Create Campaign Ads
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Host Kiosk Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData?.hostKioskAds.activeAds || 0}
              </p>
              <p className="text-xs text-gray-500">
                {analyticsData?.hostKioskAds.totalAds || 0} total
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Campaign Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData?.campaignAds.activeCampaigns || 0}
              </p>
              <p className="text-xs text-gray-500">
                {analyticsData?.campaignAds.totalCampaigns || 0} total
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Impressions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData?.campaignAds.totalImpressions.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500">All campaigns</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${analyticsData?.campaignAds.totalSpent.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500">All campaigns</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Host Kiosk Ads vs Campaign Ads Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Host Kiosk Ads</h2>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/host/ads')}
            >
              Manage
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Ads</span>
              <span className="font-semibold">{analyticsData?.hostKioskAds.activeAds || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Assignments</span>
              <span className="font-semibold">{analyticsData?.hostKioskAds.activeAssignments || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Assignments</span>
              <span className="font-semibold">{analyticsData?.hostKioskAds.totalAssignments || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create Campaign Ads</h2>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/host/new-campaign')}
            >
              Create
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Campaigns</span>
              <span className="font-semibold">{analyticsData?.campaignAds.activeCampaigns || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Impressions</span>
              <span className="font-semibold">{analyticsData?.campaignAds.totalImpressions.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Spent</span>
              <span className="font-semibold">${analyticsData?.campaignAds.totalSpent.toLocaleString() || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Kiosk Performance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Kiosk Performance</h2>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigate('/host/kiosks')}
          >
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Kiosk</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Location</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Plays</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Impressions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData?.kioskPerformance.map((kiosk) => (
                <tr key={kiosk.kioskId} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 font-medium">{kiosk.kioskName}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{kiosk.location}</td>
                  <td className="py-3 px-4">{kiosk.totalPlays.toLocaleString()}</td>
                  <td className="py-3 px-4">{kiosk.totalImpressions.toLocaleString()}</td>
                  <td className="py-3 px-4">${kiosk.revenue.toLocaleString()}</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                    No kiosk performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {analyticsData?.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {activity.type === 'host_ad' ? (
                  <Target className="h-5 w-5 text-blue-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <p className="font-medium">{activity.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.type === 'host_ad' ? 'Host Kiosk Ad' : 'Campaign'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'active' ? 'bg-green-100 text-green-800' :
                  activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {activity.status}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          )) || (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          )}
        </div>
      </Card>

      {/* Overall Analytics Summary */}
      <ProofOfPlayWidget
        accountId={user?.id}
        title="Overall Play Activity"
        showTable={true}
        showExport={true}
        maxRecords={20}
        dateRange={{
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }}
      />

      {/* Asset Selection */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Upload className="h-10 w-10 text-blue-600" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Asset-Specific Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Select an asset to view detailed analytics and performance metrics for that specific upload.
            </p>
            
            {userAssets.length > 0 ? (
              <div className="mt-4">
                <select
                  value={selectedAsset || ''}
                  onChange={(e) => setSelectedAsset(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an asset to analyze...</option>
                  {userAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.file_name} ({asset.file_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-gray-500 text-sm">No assets uploaded yet.</p>
                <Button 
                  onClick={() => navigate('/host/ads/upload')}
                  className="mt-2"
                >
                  Upload Your First Asset
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Asset-Specific Analytics */}
      {selectedAsset && (
        <AssetProofOfPlayWidget
          assetId={selectedAsset}
          title="Asset Performance Analytics"
          showTable={true}
          showExport={true}
          maxRecords={15}
          filters={{
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }}
        />
      )}
    </div>
  );
}

