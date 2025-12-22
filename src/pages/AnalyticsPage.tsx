import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsService } from '../services/analyticsService';
import { MediaService } from '../services/mediaService';
import { CampaignService, Campaign } from '../services/campaignService';
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
  
  // User Media Assets States
  const [userMediaAssets, setUserMediaAssets] = useState<Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: 'image' | 'video';
    user_id: string;
  }>>([]);
  const [mediaAssetsLoading, setMediaAssetsLoading] = useState(false);

  const dateRanges = ['1 Day', '7 Days', '30 Days', '90 Days'];

  // Helper function to get Los Angeles time (UTC-7)
  const getLosAngelesTime = () => {
    const now = new Date();
    // Convert to Los Angeles time (UTC-7)
    const laTime = new Date(now.getTime() - (7 * 60 * 60 * 1000));
    return laTime;
  };

  // Helper function to format date in Los Angeles time
  const formatDateInLATime = (dateString: string) => {
    const date = new Date(dateString);
    // Convert to Los Angeles time (UTC-7)
    const laDate = new Date(date.getTime() - (7 * 60 * 60 * 1000));
    return laDate.toISOString().replace('T', ' ').replace('Z', ' LA Time');
  };

  // Fetch user's media assets for filtering
  const fetchUserMediaAssets = useCallback(async () => {
    if (!user) return;

    try {
      setMediaAssetsLoading(true);
      const mediaAssets = await MediaService.getUserMedia(user.id);
      setUserMediaAssets(mediaAssets);
      console.log('User media assets loaded:', mediaAssets.length);
    } catch (error) {
      console.error('Error fetching user media assets:', error);
      addNotification('error', 'Media Assets Error', 'Failed to load user media assets');
    } finally {
      setMediaAssetsLoading(false);
    }
  }, [user, addNotification]);

  // Helper function to check if an asset matches user's uploaded media assets
  const isAssetFromUserMedia = (mediaId: string, assetName: string) => {
    if (!userMediaAssets.length) return false;
    
    // Check if media_id matches any user media asset ID
    const matchesById = userMediaAssets.some(asset => asset.id === mediaId);
    
    // Check if asset_name matches any user media asset file_name
    const matchesByName = userMediaAssets.some(asset => 
      asset.file_name && assetName && 
      asset.file_name.toLowerCase() === assetName.toLowerCase()
    );
    
    return matchesById || matchesByName;
  };

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

  // Calculate metrics for specific time periods
  const calculateTimePeriodMetrics = (data: CSVAnalyticsData[], days: number) => {
    const now = getLosAngelesTime();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredData = data.filter(row => {
      const rowDate = new Date(row.data_date);
      return rowDate >= startDate && rowDate <= now;
    });

    const totalImpressions = filteredData.reduce((sum, row) => sum + (row.impressions || 0), 0);
    const totalPlays = filteredData.reduce((sum, row) => sum + (row.plays || 0), 0);
    const totalClicks = filteredData.reduce((sum, row) => sum + (row.clicks || 0), 0);
    const totalCompletions = filteredData.reduce((sum, row) => sum + (row.completions || 0), 0);

    return {
      impressions: totalImpressions,
      plays: totalPlays,
      clicks: totalClicks,
      completions: totalCompletions,
      dataPoints: filteredData.length
    };
  };

  // Filter data based on selected date range
  const getFilteredCSVData = () => {
    if (!csvAnalyticsData.length) return [];
    
    const now = getLosAngelesTime();
    const days = dateRange === '1 Day' ? 1 : dateRange === '7 Days' ? 7 : dateRange === '30 Days' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Normalize dates to start of day for accurate comparison
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filtered = csvAnalyticsData.filter(row => {
      const rowDate = new Date(row.data_date);
      const normalizedRowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      const isInRange = normalizedRowDate >= normalizedStartDate && normalizedRowDate <= normalizedNow;
      
      
      return isInRange;
    });
    
    
    return filtered;
  };





  // Fetch CSV analytics data - load ALL data once
  const fetchCSVAnalyticsData = useCallback(async (isInitialLoad = false) => {
    if (!user) return;

    try {
      if (isInitialLoad) {
        setCsvLoading(true);
      }
      setCsvError(null);

      // Fetch ALL data (last 90 days to cover all possible ranges)
      const now = getLosAngelesTime();
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      // Fetch CSV analytics data and summary
      const [csvData, csvSummary] = await Promise.all([
        AnalyticsService.getCSVAnalyticsData(user.id, startDate.toISOString(), now.toISOString()),
        AnalyticsService.getCSVAnalyticsSummary(user.id, startDate.toISOString(), now.toISOString())
      ]);

      setCsvAnalyticsData(csvData);
      setCsvAnalyticsSummary(csvSummary);

    } catch (error) {
      console.error('Error fetching CSV analytics data:', error);
      setCsvError('Failed to load analytics reports. Please try again.');
      addNotification('error', 'Analytics Reports Error', 'Failed to load analytics reports. Please try again.');
    } finally {
      if (isInitialLoad) {
        setCsvLoading(false);
      }
    }
  }, [user, addNotification]);

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

    // Add overall timeout for the entire S3 loading process
    let loadingTimeout: NodeJS.Timeout | null = null;
    
    try {
      setS3Loading(true);
      setS3Error(null);

      console.log('Fetching S3 CSV files with config:', {
        bucket: config.bucket_name,
        region: config.region,
        hasAccessKey: !!config.access_key_id,
        hasSecretKey: !!config.secret_access_key
      });

      // Set the timeout
      loadingTimeout = setTimeout(() => {
        console.log('S3 loading timeout reached, stopping process');
        setS3Loading(false);
        setS3Error('S3 loading timeout - process took too long');
        addNotification('error', 'S3 Timeout', 'S3 loading process timed out. Please try again.');
      }, 300000); // 5 minutes timeout for processing all files

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
      ]) as Array<{key: string; size?: number; lastModified?: Date}>;
      
      console.log('Found CSV files:', csvFiles.length);

      const allAnalyticsData: S3AnalyticsData[] = [];

      // Process ALL CSV files to get complete data
      const filesToProcess = csvFiles;
      
      console.log(`Processing ALL ${filesToProcess.length} CSV files to get complete data`);
      
      // Process each CSV file with timeout protection
      let processedFiles = 0;
      let totalRecords = 0;
      
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        try {
          console.log(`Processing file ${i + 1}/${filesToProcess.length}: ${file.key}`);
          
          // Add timeout for individual file processing
          const csvContent = await Promise.race([
            AWSS3Service.getObjectAsText(s3ConfigForAWS, file.key),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`File ${file.key} timeout after 15 seconds`)), 15000)
            )
          ]) as string;
          
          const parsedData = AWSS3Service.parseCSV(csvContent);
          
          // Debug: Log the actual column names and sample data
          if (i === 0 && parsedData.length > 0) {
            console.log('CSV Column Names Debug:', {
              fileName: file.key,
              totalRows: parsedData.length,
              columnNames: Object.keys(parsedData[0]),
              sampleRow: parsedData[0],
              allColumnValues: Object.keys(parsedData[0]).reduce((acc, key) => {
                acc[key] = parsedData[0][key];
                return acc;
              }, {} as Record<string, string | number>)
            });
          }
          
          // Convert to S3AnalyticsData format with correct column mapping for your CSV structure
          const analyticsData = parsedData.map((row: Record<string, string | number>) => ({
            file_name: file.key.split('/').pop() || file.key,
            data_date: String(row['Report Date UTC'] || row['Start Time UTC'] || new Date().toISOString().split('T')[0]),
            kiosk_id: String(row['Screen UUID'] || row['Account ID'] || ''),
            campaign_id: String(row['Account ID'] || ''),
            media_id: String(row['Asset ID'] || ''),
            play_date: String(row['Start Time UTC'] || row['Report Date UTC'] || ''),
            play_duration: Number(row['Duration'] || 0),
            play_count: 1, // Each row represents one play/impression
            device_id: String(row['Screen UUID'] || ''),
            location: String(row['Screen Name'] || ''),
            // Additional fields from your CSV
            asset_name: String(row['Asset Name'] || ''),
            screen_name: String(row['Screen Name'] || ''),
            screen_tags: String(row['Screen Tags'] || ''),
            asset_tags: String(row['Asset Tags'] || ''),
            device_local_time: String(row['Device Local Time'] || ''),
            ...row
          }));
          
          allAnalyticsData.push(...analyticsData);
          processedFiles++;
          totalRecords += analyticsData.length;
          
          // Debug: Log sample of mapped data
          if (i === 0 && analyticsData.length > 0) {
            console.log('Mapped Analytics Data Sample:', {
              fileName: file.key,
              sampleMappedData: analyticsData.slice(0, 2).map(row => ({
                media_id: row.media_id,
                play_count: row.play_count,
                play_duration: row.play_duration,
                data_date: row.data_date
              }))
            });
          }
          
          console.log(`Successfully processed file ${file.key}: ${analyticsData.length} records (Total: ${totalRecords} records from ${processedFiles} files)`);
          
        } catch (error) {
          console.error(`Error processing file ${file.key}:`, error);
          // Continue with next file instead of stopping
        }
      }
      
      console.log(`Completed processing: ${processedFiles}/${filesToProcess.length} files, ${totalRecords} total records`);

      setS3AnalyticsData(allAnalyticsData);
      
      // Clear the timeout since we completed successfully
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      
      console.log('S3 data loaded successfully:', {
        totalFiles: csvFiles.length,
        processedFiles: processedFiles,
        totalRecords: allAnalyticsData.length
      });

      addNotification('success', 'S3 Data Loaded', `Successfully loaded ${processedFiles}/${csvFiles.length} CSV files with ${allAnalyticsData.length} total records`);

    } catch (error) {
      console.error('Error fetching S3 CSV files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load CSV files from S3';
      setS3Error(errorMessage);
      addNotification('error', 'S3 Error', `Failed to load CSV files from AWS S3: ${errorMessage}`);
    } finally {
      // Clear the timeout in case of error
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      setS3Loading(false);
      console.log('S3 loading process completed');
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
      fetchUserMediaAssets(); // Load user media assets for filtering
    }
  }, [user, fetchCSVAnalyticsData, fetchUserMediaAssets]);



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


  if (csvLoading || mediaAssetsLoading) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {csvLoading ? 'Loading analytics reports...' : 'Loading media assets...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (csvError) {
    return (
      <DashboardLayout
        title="Analytics"
        subtitle="Analytics reports and performance insights"
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
              Retry CSV Data
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if data is available
  const hasCSVData = csvAnalyticsData && csvAnalyticsData.length > 0;

  return (
    <DashboardLayout
      title="Analytics"
      subtitle="Analytics reports and performance insights"
    >
      {/* Date Range Selector */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white"></h2>
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
              fetchCSVAnalyticsData(false); // Don't show loading state for refresh
              fetchUserMediaAssets(); // Refresh user media assets
            }}
            disabled={csvLoading || mediaAssetsLoading}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-xs sm:text-sm"
          >
            <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${(csvLoading || mediaAssetsLoading) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>

      {/* Estimated Impressions Analytics - Show First */}
      <EstimatedImpressionsSection userId={user?.id} dateRange={dateRange} />

      {/* CSV Data Summary for Selected Period */}
      {hasCSVData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Historical Analytics Data - {dateRange}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {(() => {
              const filteredData = getFilteredCSVData();
              const totalImpressions = filteredData.reduce((sum, row) => sum + (row.impressions || 0), 0);
              const totalPlays = filteredData.reduce((sum, row) => sum + (row.plays || 0), 0);
              const totalClicks = filteredData.reduce((sum, row) => sum + (row.clicks || 0), 0);
              const totalCompletions = filteredData.reduce((sum, row) => sum + (row.completions || 0), 0);
              
              return (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Impressions</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{formatNumber(totalImpressions)}</div>
                    <p className="text-gray-600 dark:text-white text-sm">Total impressions</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Plays</h4>
                    <div className="text-3xl font-bold text-green-600 mb-2">{formatNumber(totalPlays)}</div>
                    <p className="text-gray-600 dark:text-white text-sm">Total plays</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Clicks</h4>
                    <div className="text-3xl font-bold text-purple-600 mb-2">{formatNumber(totalClicks)}</div>
                    <p className="text-gray-600 dark:text-white text-sm">Total clicks</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Completions</h4>
                    <div className="text-3xl font-bold text-orange-600 mb-2">{formatNumber(totalCompletions)}</div>
                    <p className="text-gray-600 dark:text-white text-sm">Total completions</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
    </DashboardLayout>
  );
}

// Estimated Impressions Component
function EstimatedImpressionsSection({ userId, dateRange }: { userId?: string; dateRange: string }) {
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Average impressions per slot per day (configurable estimate)
  const IMPRESSIONS_PER_SLOT_PER_DAY = 150;

  useEffect(() => {
    if (!userId) return;
    
    const fetchActiveCampaigns = async () => {
      try {
        setLoading(true);
        const campaigns = await CampaignService.getUserCampaigns(userId);
        // Filter for active campaigns
        const active = campaigns.filter(c => c.status === 'active');
        setActiveCampaigns(active);
      } catch (error) {
        console.error('Error fetching active campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCampaigns();
  }, [userId]);

  const calculateEstimates = () => {
    if (!activeCampaigns.length) {
      return {
        totalSlots: 0,
        estimatedImpressionsPerDay: 0,
        estimatedImpressionsForRange: 0,
        activeCampaignsCount: 0
      };
    }

    const totalSlots = activeCampaigns.reduce((sum, campaign) => sum + (campaign.total_slots || 0), 0);
    const estimatedImpressionsPerDay = totalSlots * IMPRESSIONS_PER_SLOT_PER_DAY;
    
    const days = dateRange === '1 Day' ? 1 : dateRange === '7 Days' ? 7 : dateRange === '30 Days' ? 30 : 90;
    const estimatedImpressionsForRange = estimatedImpressionsPerDay * days;

    return {
      totalSlots,
      estimatedImpressionsPerDay,
      estimatedImpressionsForRange,
      activeCampaignsCount: activeCampaigns.length
    };
  };

  const estimates = calculateEstimates();
  const formatNumber = (num: number) => num.toLocaleString();

  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Estimated Impressions Analytics</h2>
      

      {estimates.activeCampaignsCount === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            No active campaigns found. Start a campaign to see estimated impressions.
          </p>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Note:</strong> These are estimated impressions based on average performance metrics. 
          Actual impressions may vary based on kiosk location, time of day, and audience engagement.
        </p>
      </div>
    </div>
  );
}
