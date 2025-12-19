import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { AnalyticsService } from '../../services/analyticsService';

interface AnalyticsSummary {
  uniqueAssets: number;
  totalPlays: number;
  totalDuration: number;
}

interface AssetPerformance {
  assetId: string;
  assetName: string;
  plays: number;
  duration: number;
  period: string;
  fileType: string;
}

export default function Analytics() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    uniqueAssets: 0,
    totalPlays: 0,
    totalDuration: 0
  });
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance[]>([]);

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
      
      // Get date range based on selected time range - Safari compatible
      const getDateRange = (range: string) => {
        const now = new Date();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        // Safari-compatible date formatting
        const formatDateForSafari = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        return {
          startDate: formatDateForSafari(startDate),
          endDate: formatDateForSafari(now)
        };
      };

      const { startDate, endDate } = getDateRange(timeRange);
      
      // Fetch CSV analytics data for client user
      const csvData = await AnalyticsService.getCSVAnalyticsData(user!.id, startDate, endDate);
      
      // Calculate summary metrics from real CSV data
      const uniqueAssets = new Set(csvData.map(row => row.file_name)).size;
      const totalPlays = csvData.reduce((sum, row) => sum + (row.plays || 0), 0);
      const totalDuration = csvData.reduce((sum, row) => sum + (row.plays || 0) * 15, 0);
      
      setSummary({
        uniqueAssets,
        totalPlays,
        totalDuration
      });
      
      // Group data by asset and calculate performance
      const assetMap = new Map();
      csvData.forEach(row => {
        if (row.file_name) {
          const key = row.file_name;
          if (!assetMap.has(key)) {
            assetMap.set(key, {
              assetId: row.id || row.file_name,
              assetName: row.file_name,
              plays: 0,
              duration: 0,
              period: `${row.data_date} - ${row.data_date}`,
              fileType: row.file_name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
            });
          }
          const asset = assetMap.get(key);
          asset.plays += row.plays || 0;
          asset.duration += (row.plays || 0) * 15;
          asset.period = `${row.data_date} - ${row.data_date}`;
        }
      });
      
      // Set asset performance data
      setAssetPerformance(Array.from(assetMap.values())
        .sort((a, b) => b.plays - a.plays));
      
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
          <p className="text-gray-600 mt-2">Analytics reports and performance insights from AWS S3 data</p>
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
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Analytics Summary - {timeRange === '1d' ? '1 Day' : timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days'}
        </h2>
        <p className="text-gray-600 mb-6">
          Shows total plays and duration for each unique Asset ID within the selected time period
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.uniqueAssets}</div>
            <div className="text-sm text-gray-600">Unique Assets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{summary.totalPlays.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Plays</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{summary.totalDuration.toFixed(3)}s</div>
            <div className="text-sm text-gray-600">Total Duration</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{calculateEstimatedImpressionsPerDay(summary.uniqueAssets).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Est. Impressions/Day</div>
            <div className="text-xs text-gray-500 mt-1">(Based on 5-min intervals)</div>
          </div>
        </div>
      </div>

      {/* Asset Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assetPerformance.map((asset) => (
          <div key={asset.assetId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-green-600 mb-2">{asset.plays.toLocaleString()} Plays</div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Name:</strong> {asset.assetName}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Period:</strong> {asset.period}
              </div>
            </div>
            
            {/* Ad Preview Placeholder */}
            <div className="bg-blue-600 rounded-lg p-4 text-center text-white">
              <div className="text-lg font-bold mb-2">I AM YOUR AD</div>
              <div className="text-sm">Ad Preview</div>
              <div className="text-xs mt-1">Asset: {asset.assetName}</div>
            </div>
          </div>
        ))}
      </div>

      {assetPerformance.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500 text-lg">No CSV analytics data found</div>
          <div className="text-gray-400 text-sm mt-2">
            CSV data from AWS S3 needs to be imported into the system. 
            <br />
            Contact your administrator to import CSV analytics data from S3 bucket.
          </div>
        </div>
      )}
    </div>
  );
}