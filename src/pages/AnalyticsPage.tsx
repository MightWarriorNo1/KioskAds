import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsService } from '../services/analyticsService';
import { S3Service } from '../services/s3Service';
import { AWSS3Service } from '../services/awsS3Service';
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

interface S3CSVFile {
  key: string;
  size?: number;
  lastModified?: Date;
  content?: string;
  parsedData?: Record<string, string | number>[];
}

interface S3AnalyticsData {
  file_name: string;
  data_date: string;
  kiosk_id: string;
  campaign_id: string;
  media_id: string;
  play_date: string;
  play_duration: number;
  play_count: number;
  device_id?: string;
  location?: string;
  [key: string]: string | number | undefined;
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
  
  // S3 Data States
  const [s3Files, setS3Files] = useState<S3CSVFile[]>([]);
  const [s3AnalyticsData, setS3AnalyticsData] = useState<S3AnalyticsData[]>([]);
  const [s3Loading, setS3Loading] = useState(false);
  const [s3Error, setS3Error] = useState<string | null>(null);
  const [s3ConfigLoaded, setS3ConfigLoaded] = useState(false);

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


  // Fetch CSV analytics data
  const fetchCSVAnalyticsData = useCallback(async (isInitialLoad = false) => {
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
  }, [user, addNotification, dateRange]);

  // Fetch S3 CSV files from optisignsreports bucket
  const fetchS3CSVFiles = useCallback(async (config: {
    id: string;
    name: string;
    bucket_name: string;
    region: string;
    access_key_id: string;
    secret_access_key: string;
    is_active: boolean;
  }) => {
    if (!config) {
      console.error('No S3 configuration available');
      setS3Error('No S3 configuration available');
      return;
    }

    try {
      setS3Loading(true);
      setS3Error(null);

      console.log('Fetching S3 CSV files with config:', {
        bucket: config.bucket_name,
        region: config.region,
        hasAccessKey: !!config.access_key_id,
        hasSecretKey: !!config.secret_access_key
      });

      // Create AWS S3 client configuration
      const s3ConfigForAWS = {
        bucketName: config.bucket_name,
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
        region: config.region
      };

      console.log('Attempting to list objects from S3...');
      
      // List CSV files from S3 with timeout
      const csvFiles = await Promise.race([
        AWSS3Service.listObjects(s3ConfigForAWS, 'reports/'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('S3 request timeout after 30 seconds')), 30000)
        )
      ]) as S3CSVFile[];
      
      console.log('Found CSV files:', csvFiles.length);

      const allAnalyticsData: S3AnalyticsData[] = [];

      // Process each CSV file
      for (const file of csvFiles) {
        try {
          const csvContent = await AWSS3Service.getObjectAsText(s3ConfigForAWS, file.key);
          const parsedData = AWSS3Service.parseCSV(csvContent);
          
          // Convert to S3AnalyticsData format
          const analyticsData = parsedData.map((row: Record<string, string | number>) => ({
            file_name: file.key.split('/').pop() || file.key,
            data_date: String(row.play_date || row.date || new Date().toISOString().split('T')[0]),
            kiosk_id: String(row.kiosk_id || row.device_id || ''),
            campaign_id: String(row.campaign_id || ''),
            media_id: String(row.media_id || row.asset_id || ''),
            play_date: String(row.play_date || row.date || ''),
            play_duration: Number(row.play_duration) || 0,
            play_count: Number(row.play_count) || Number(row.count) || 0,
            device_id: String(row.device_id || ''),
            location: String(row.location || row.kiosk_location || ''),
            ...row
          }));
          
          allAnalyticsData.push(...analyticsData);
        } catch (error) {
          console.error(`Error processing file ${file.key}:`, error);
        }
      }

      setS3Files(csvFiles);
      setS3AnalyticsData(allAnalyticsData);
      
      console.log('S3 data loaded successfully:', {
        files: csvFiles.length,
        records: allAnalyticsData.length
      });

      addNotification('success', 'S3 Data Loaded', `Successfully loaded ${csvFiles.length} CSV files with ${allAnalyticsData.length} records`);

    } catch (error) {
      console.error('Error fetching S3 CSV files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load CSV files from S3';
      setS3Error(errorMessage);
      addNotification('error', 'S3 Error', `Failed to load CSV files from AWS S3: ${errorMessage}`);
    } finally {
      setS3Loading(false);
    }
  }, [addNotification]);

  // Load S3 configuration only (without fetching data)
  const loadS3Configuration = useCallback(async () => {
    try {
      setS3Loading(true);
      setS3Error(null);
      
      console.log('Loading S3 configuration...');
      
      // Get S3 configuration
      const config = await S3Service.getS3Configuration();
      console.log('S3 config result:', config);
      
      if (!config) {
        const errorMsg = 'No S3 configuration found. Please contact your administrator to configure S3 settings.';
        setS3Error(errorMsg);
        addNotification('error', 'S3 Configuration', errorMsg);
        return null;
      }
      
      console.log('S3 configuration loaded:', {
        name: config.name,
        bucket: config.bucket_name,
        region: config.region,
        is_active: config.is_active
      });
      
      setS3ConfigLoaded(true);
      return config;
      
    } catch (error) {
      console.error('Error loading S3 configuration:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load S3 configuration';
      setS3Error(errorMsg);
      addNotification('error', 'S3 Error', errorMsg);
      return null;
    } finally {
      setS3Loading(false);
    }
  }, [addNotification]);

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchCSVAnalyticsData(true); // Initial CSV load
      
      // Load S3 configuration and data only once
      if (!s3ConfigLoaded) {
        const loadS3Data = async () => {
          try {
            console.log('Starting S3 data loading process...');
            const config = await loadS3Configuration();
            if (config) {
              console.log('S3 config loaded, now fetching CSV files...');
              await fetchS3CSVFiles(config);
            } else {
              console.log('No S3 config found, skipping S3 data fetch');
            }
          } catch (error) {
            console.error('Error in S3 data loading process:', error);
            setS3Error('Failed to load S3 data');
            setS3Loading(false);
          }
        };
        
        loadS3Data();
      }
    }
  }, [user, fetchCSVAnalyticsData, loadS3Configuration, fetchS3CSVFiles, s3ConfigLoaded]);


  // Fetch data when date range changes (without showing loading state)
  useEffect(() => {
    if (user && dateRange) {
      fetchCSVAnalyticsData(false); // Fetch CSV data
    }
  }, [dateRange, user, fetchCSVAnalyticsData]);

  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  // Test S3 connection manually
  const testS3Connection = async () => {
    try {
      setS3Loading(true);
      setS3Error(null);
      
      console.log('Testing S3 connection...');
      const config = await S3Service.getS3Configuration();
      
      if (!config) {
        setS3Error('No S3 configuration found');
        addNotification('error', 'S3 Test', 'No S3 configuration found');
        return;
      }

      console.log('S3 config found:', config);
      
      // Test connection by listing objects
      const s3ConfigForAWS = {
        bucketName: config.bucket_name,
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
        region: config.region
      };

      console.log('Testing S3 connection with config:', s3ConfigForAWS);
      
      const testFiles = await AWSS3Service.listObjects(s3ConfigForAWS, 'reports/');
      console.log('S3 connection test successful:', testFiles.length, 'files found');
      
      addNotification('success', 'S3 Test', `S3 connection successful! Found ${testFiles.length} files in reports/ folder`);
      
    } catch (error) {
      console.error('S3 connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'S3 connection test failed';
      setS3Error(errorMessage);
      addNotification('error', 'S3 Test', `S3 connection test failed: ${errorMessage}`);
    } finally {
      setS3Loading(false);
    }
  };


  if (csvLoading || s3Loading) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights from AWS S3 data"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {csvLoading ? 'Loading analytics reports...' : 'Loading S3 CSV files...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (csvError || s3Error) {
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
            <p className="text-gray-600 mb-4">{csvError || s3Error}</p>
            <div className="space-x-4">
              {csvError && (
                <button 
                  onClick={() => fetchCSVAnalyticsData(true)}
                  className="btn-primary"
                >
                  Retry CSV Data
                </button>
              )}
              {s3Error && (
                <button 
                  onClick={async () => {
                    const config = await loadS3Configuration();
                    if (config) {
                      await fetchS3CSVFiles(config);
                    }
                  }}
                  className="btn-primary"
                >
                  Retry S3 Data
                </button>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if data is available
  const hasCSVData = csvAnalyticsData && csvAnalyticsData.length > 0;
  const hasS3Data = s3AnalyticsData && s3AnalyticsData.length > 0;
  const hasAnyData = hasCSVData || hasS3Data;

  if (!hasAnyData && !csvLoading && !s3Loading) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights from AWS S3 data"
      >
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No data available</p>
          <div className="space-x-4">
            <button 
              onClick={() => fetchCSVAnalyticsData(true)}
              className="btn-primary"
            >
              Load CSV Data
            </button>
            <button 
              onClick={async () => {
                const config = await loadS3Configuration();
                if (config) {
                  await fetchS3CSVFiles(config);
                }
              }}
              className="btn-primary"
            >
              Load S3 Data
            </button>
            <button 
              onClick={testS3Connection}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-xs sm:text-sm"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Test S3 Connection</span>
              <span className="sm:hidden">Test S3</span>
            </button>
          </div>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {dateRanges.map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white dark:bg-gray-700 dark:text-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              fetchCSVAnalyticsData(true);
              const config = await loadS3Configuration();
              if (config) {
                await fetchS3CSVFiles(config);
              }
            }}
            disabled={csvLoading || s3Loading}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-xs sm:text-sm"
          >
            <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${(csvLoading || s3Loading) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>

      {/* Scheduled Import Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-8">
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
              <p>• CSV files are automatically fetched from AWS S3 optisignsreports bucket every night at 1:15 AM Los Angeles time</p>
              <p>• Data is processed and displayed on this analytics dashboard</p>
              <p>• All CSV files in the reports/ folder are automatically processed</p>
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
              {s3Files.length > 0 && (
                <p>• Currently showing {s3Files.length} CSV files from S3 bucket</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AWS S3 Analytics Overview */}
      {csvAnalyticsSummary && csvAnalyticsSummary.data_points_count > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Analytics Data from AWS S3</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Impressions</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.total_impressions)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Clicks</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.total_clicks)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Engagement Rate</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPercentage(csvAnalyticsSummary.avg_engagement_rate)}%
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Average from AWS S3 data</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Data Points</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(csvAnalyticsSummary.data_points_count)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Records from AWS S3</p>
            </div>
          </div>

          {/* AWS S3 Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">Analytics Data Table (AWS S3)</h3>
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
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                        Location
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                        Clicks
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plays
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                        Completions
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                        Engagement Rate
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden xl:table-cell">
                        Click Rate
                      </th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden xl:table-cell">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {csvAnalyticsData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(row.data_date).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                          {row.location || 'Unknown'}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.plays)}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                          {formatNumber(row.completions)}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                          {formatPercentage(row.engagement_rate)}%
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden xl:table-cell">
                          {formatPercentage(row.play_rate)}%
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden xl:table-cell">
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

      {/* S3 CSV Files Overview */}
      {hasS3Data && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">S3 CSV Files Data</h2>
          
          {/* S3 Files Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total CSV Files</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(s3Files.length)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Files from S3 bucket</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Records</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(s3AnalyticsData.length)}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Records from all CSV files</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Plays</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(s3AnalyticsData.reduce((sum, row) => sum + (row.play_count || 0), 0))}
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Total play count</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Duration</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(s3AnalyticsData.reduce((sum, row) => sum + (row.play_duration || 0), 0))}s
              </div>
              <p className="text-gray-600 dark:text-white text-sm">Total play duration</p>
            </div>
          </div>

          {/* S3 Files List */}
          <div className="bg-[rgb(var(--surface))] dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">S3 CSV Files</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                      Size
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                      Last Modified
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Records
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {s3Files.map((file) => {
                    const fileRecords = s3AnalyticsData.filter(row => row.file_name === file.key.split('/').pop());
                    return (
                      <tr key={file.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-xs truncate" title={file.key.split('/').pop()}>
                            {file.key.split('/').pop()}
                          </div>
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                          {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(fileRecords.length)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* S3 Analytics Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">S3 Analytics Data</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                      File
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                      Kiosk ID
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                      Campaign ID
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                      Media ID
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Play Count
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                      Duration
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden xl:table-cell">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {s3AnalyticsData.slice(0, 100).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                        <div className="max-w-xs truncate" title={row.file_name}>
                          {row.file_name}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(row.data_date).toLocaleDateString()}
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white hidden md:table-cell">
                        <div className="max-w-xs truncate" title={row.kiosk_id}>
                          {row.kiosk_id}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                        <div className="max-w-xs truncate" title={row.campaign_id}>
                          {row.campaign_id}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                        <div className="max-w-xs truncate" title={row.media_id}>
                          {row.media_id}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatNumber(row.play_count)}
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                        {formatNumber(row.play_duration)}s
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 dark:text-white hidden xl:table-cell">
                        <div className="max-w-xs truncate" title={row.location || 'Unknown'}>
                          {row.location || 'Unknown'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s3AnalyticsData.length > 100 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Showing first 100 records of {formatNumber(s3AnalyticsData.length)} total records
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
