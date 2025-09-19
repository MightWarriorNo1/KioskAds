import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Play, 
  Users, 
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService } from '../../services/adminService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../shared/LoadingSpinner';

interface AnalyticsMetrics {
  totalPlays: number;
  totalImpressions: number;
  totalUsers: number;
  totalKiosks: number;
  playsGrowth: number;
  impressionsGrowth: number;
  averagePlayDuration: number;
  topPerformingKiosks: Array<{
    kioskId: string;
    kioskName: string;
    location: string;
    plays: number;
    impressions: number;
  }>;
  topPerformingUsers: Array<{
    userId: string;
    userName: string;
    userType: 'client' | 'host';
    plays: number;
    impressions: number;
  }>;
  playsByDay: Array<{
    date: string;
    plays: number;
    impressions: number;
  }>;
  playsByUserType: Array<{
    userType: 'client' | 'host';
    plays: number;
    impressions: number;
  }>;
}

interface DateRange {
  start: string;
  end: string;
}

export default function Analytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [selectedUserType, setSelectedUserType] = useState<'all' | 'client' | 'host'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { addNotification } = useNotification();

  // Debounced effect to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAnalyticsData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [dateRange, selectedPeriod, selectedUserType]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // This will be implemented in the admin service
      const data = await AdminService.getAnalyticsData(dateRange, selectedUserType);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      addNotification('error', 'Error', 'Failed to load analytics data');
      
      // Set empty metrics to prevent UI crashes
      setMetrics({
        totalPlays: 0,
        totalImpressions: 0,
        totalUsers: 0,
        totalKiosks: 0,
        playsGrowth: 0,
        impressionsGrowth: 0,
        averagePlayDuration: 0,
        topPerformingKiosks: [],
        topPerformingUsers: [],
        playsByDay: [],
        playsByUserType: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: '7d' | '30d' | '90d' | '1y' | 'custom') => {
    setSelectedPeriod(period);
    
    if (period === 'custom') return;
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    addNotification('info', 'Export', 'Export functionality will be implemented soon');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Ad plays and impressions data across all users</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading analytics data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Ad plays and impressions data across all users</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {/* User Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">User Type:</label>
            <select
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Users</option>
              <option value="client">Clients Only</option>
              <option value="host">Hosts Only</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {selectedPeriod === 'custom' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Plays</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.totalPlays.toLocaleString() || 0}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 ml-1">
                  +{metrics?.playsGrowth || 0}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Play className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Impressions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.totalImpressions.toLocaleString() || 0}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 ml-1">
                  +{metrics?.impressionsGrowth || 0}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.totalUsers.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Kiosks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.totalKiosks.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plays Over Time */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plays Over Time</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization will be implemented</p>
            </div>
          </div>
        </Card>

        {/* Plays by User Type */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plays by User Type</h3>
          <div className="space-y-3">
            {metrics?.playsByUserType.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    item.userType === 'client' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {item.userType}s
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.impressions.toLocaleString()} impressions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Kiosks */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Kiosks</h3>
          <div className="space-y-3">
            {metrics?.topPerformingKiosks.slice(0, 5).map((kiosk, index) => (
              <div key={kiosk.kioskId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{kiosk.kioskName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{kiosk.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {kiosk.plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {kiosk.impressions.toLocaleString()} impressions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performing Users */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Users</h3>
          <div className="space-y-3">
            {metrics?.topPerformingUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    user.userType === 'client' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      user.userType === 'client' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.userName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.userType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user.plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.impressions.toLocaleString()} impressions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

