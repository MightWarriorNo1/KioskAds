import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsService } from '../services/analyticsService';
import { useNotification } from '../contexts/NotificationContext';

interface CSVAnalyticsData {
  id: string;
  file_name: string;
  data_date: string;
  campaign_id: string | null;
  kiosk_id: string | null;
  location: string | null;
  impressions: number;
  clicks: number;
  plays: number;
  completions: number;
  engagement_rate: number;
  play_rate: number;
  completion_rate: number;
  created_at: string;
}

interface CSVAnalyticsSummary {
  total_impressions: number;
  total_clicks: number;
  total_plays: number;
  total_completions: number;
  avg_engagement_rate: number;
  avg_play_rate: number;
  avg_completion_rate: number;
  data_points_count: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [dateRange, setDateRange] = useState('30 Days');
  const [csvAnalyticsData, setCsvAnalyticsData] = useState<CSVAnalyticsData[]>([]);
  const [csvAnalyticsSummary, setCsvAnalyticsSummary] = useState<CSVAnalyticsSummary | null>(null);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);

  const dateRanges = ['7 Days', '30 Days', '90 Days'];

  // Helper function to format numbers
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  // Helper function to format percentages
  const formatPercentage = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0.00';
    return num.toFixed(2);
  };

  // Calculate date range
  const getDateRange = (range: string) => {
    const now = new Date();
    const days = range === '7 Days' ? 7 : range === '30 Days' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };


  // Fetch data on component mount and when date range changes
  useEffect(() => {
    if (user) {
      fetchCSVAnalyticsData(true); // Initial CSV load
    }
  }, [user]);

  // Fetch CSV analytics data
  const fetchCSVAnalyticsData = async (isInitialLoad = false) => {
    if (!user) return;

    try {
      if (isInitialLoad) {
        setCsvLoading(true);
      }
      setCsvError(null);

      const { startDate, endDate } = getDateRange(dateRange);
      
      // Fetch CSV analytics data and summary
      const [csvData, csvSummary] = await Promise.all([
        AnalyticsService.getCSVAnalyticsData(user.id, startDate, endDate),
        AnalyticsService.getCSVAnalyticsSummary(user.id, startDate, endDate)
      ]);

      setCsvAnalyticsData(csvData);
      setCsvAnalyticsSummary(csvSummary);

      // Get the most recent import time
      if (csvData.length > 0) {
        const mostRecentImport = csvData.reduce((latest, current) => 
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        );
        setLastImportTime(mostRecentImport.created_at);
      }

    } catch (error) {
      console.error('Error fetching CSV analytics data:', error);
      setCsvError('Failed to load analytics reports. Please try again.');
      addNotification('error', 'Analytics Reports Error', 'Failed to load analytics reports. Please try again.');
    } finally {
      if (isInitialLoad) {
        setCsvLoading(false);
      }
    }
  };

  // Fetch data when date range changes (without showing loading state)
  useEffect(() => {
    if (user && dateRange) {
      fetchCSVAnalyticsData(false); // Fetch CSV data
    }
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  if (csvLoading) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights from AWS S3 data"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (csvError) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights from AWS S3 data"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{csvError}</p>
            <button 
              onClick={() => fetchCSVAnalyticsData(true)}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if CSV data is available
  const hasCSVData = csvAnalyticsData && csvAnalyticsData.length > 0;

  if (!hasCSVData && !csvLoading) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights from AWS S3 data"
      >
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Analytics"
      subtitle="Analytics reports and performance insights from AWS S3 data"
    >
      {/* Date Range Selector */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Reports</h2>
        </div>
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {dateRanges.map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-white dark:bg-gray-700 dark:text-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled Import Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Automated CSV Import Schedule
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>• CSV files are automatically pulled from AWS S3 every night at 1:15 AM Los Angeles time</p>
              <p>• Data is processed and displayed on this analytics dashboard</p>
              {lastImportTime && (
                <p>• Last import: {new Date(lastImportTime).toLocaleString('en-US', { 
                  timeZone: 'America/Los_Angeles',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} LA time</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AWS S3 Analytics Overview */}
      {csvAnalyticsSummary && csvAnalyticsSummary.data_points_count > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Analytics Data from AWS S3</h2>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Impressions</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.total_impressions)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports</p>
            </div>

            <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Clicks</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.total_clicks)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports</p>
            </div>

            <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Engagement Rate</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPercentage(csvAnalyticsSummary.avg_engagement_rate)}%
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Average from AWS S3 data</p>
            </div>

            <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Data Points</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.data_points_count)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Records from AWS S3</p>
            </div>
          </div>

          {/* AWS S3 Data Table */}
          <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Analytics Data Table (AWS S3)</h3>
            {csvLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading analytics reports...</p>
                </div>
              </div>
            ) : csvError ? (
              <div className="text-center py-8 text-red-600">
                <p>{csvError}</p>
                <button 
                  onClick={() => fetchCSVAnalyticsData(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Try Again
                </button>
              </div>
            ) : csvAnalyticsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plays
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Completions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Engagement Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Click Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {csvAnalyticsData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(row.data_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {row.location || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.plays)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.completions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatPercentage(row.engagement_rate)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatPercentage(row.play_rate)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatPercentage(row.completion_rate)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
