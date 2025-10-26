import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { AWSS3Service } from '../../services/awsS3Service';
import { S3Service } from '../../services/s3Service';
import { AnalyticsService } from '../../services/analyticsService';
import { MediaService } from '../../services/mediaService';
import { supabase } from '../../lib/supabaseClient';

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

export default function HostAnalytics() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [dateRange, setDateRange] = useState('30 Days');
  const [csvAnalyticsData, setCsvAnalyticsData] = useState<CSVAnalyticsData[]>([]);
  const [csvAnalyticsSummary, setCsvAnalyticsSummary] = useState<CSVAnalyticsSummary | null>(null);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  
  // S3 Data States
  const [s3AnalyticsData, setS3AnalyticsData] = useState<S3AnalyticsData[]>([]);
  const [s3Loading, setS3Loading] = useState(false);
  const [s3Error, setS3Error] = useState<string | null>(null);
  const [s3ConfigLoaded, setS3ConfigLoaded] = useState(false);
  
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

  // Fetch user's media assets for filtering
  const fetchUserMediaAssets = useCallback(async () => {
    if (!user) return;

    try {
      setMediaAssetsLoading(true);
      console.log('Analytics: Fetching media assets for user:', user.id);
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

  // Calculate metrics for specific time periods
  const calculateTimePeriodMetrics = (data: CSVAnalyticsData[], days: number) => {
    const now = new Date();
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
    
    const now = new Date();
    const days = dateRange === '1 Day' ? 1 : dateRange === '7 Days' ? 7 : dateRange === '30 Days' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Normalize dates to start of day for accurate comparison
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filtered = csvAnalyticsData.filter(row => {
      // Safari-compatible date parsing
      if (!row.data_date || typeof row.data_date !== 'string') {
        return false;
      }
      
      const dateMatch = row.data_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        return false;
      }
      
      const [, year, month, day] = dateMatch;
      const rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isNaN(rowDate.getTime())) {
        return false;
      }
      
      const normalizedRowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      const isInRange = normalizedRowDate >= normalizedStartDate && normalizedRowDate <= normalizedNow;
      
      return isInRange;
    });
    
    
    return filtered;
  };

  const getFilteredS3Data = () => {
    if (!s3AnalyticsData.length) return [];
    
    // Get number of CSV files to include based on date range
    const csvFilesToInclude = dateRange === '1 Day' ? 1 : dateRange === '7 Days' ? 7 : dateRange === '30 Days' ? 30 : 90;
    
    // Group data by file_name to get unique files
    const filesMap = new Map<string, S3AnalyticsData[]>();
    s3AnalyticsData.forEach(row => {
      if (!filesMap.has(row.file_name)) {
        filesMap.set(row.file_name, []);
      }
      filesMap.get(row.file_name)!.push(row);
    });
    
    // Get all unique file names and sort them (assuming they have some ordering)
    const allFiles = Array.from(filesMap.keys()).sort();
    
    // Take the last N files based on the date range
    const filesToInclude = allFiles.slice(-csvFilesToInclude);
    
    // Filter data to only include records from the selected files
    const filtered = s3AnalyticsData.filter(row => {
      return filesToInclude.includes(row.file_name);
    });
    
    return filtered;
  };

  // Aggregate S3 data by asset ID (media_id)
  const getAssetAnalytics = () => {
    const filteredData = getFilteredS3Data();
    
    
    // Group by media_id (asset ID) only
    const assetMap = new Map<string, {
      asset_id: string;
      asset_name: string;
      total_plays: number;
      total_duration: number;
      total_impressions: number;
      data_points: number;
      locations: Set<string>;
      campaigns: Set<string>;
      date_range: {
        start: string;
        end: string;
      };
    }>();

    filteredData.forEach((row) => {
      const assetId = row.media_id;
      const assetName = String(row.asset_name || (assetId.includes('.') ? assetId : `${assetId}.mp4`));
      
      
      if (!assetMap.has(assetId)) {
        assetMap.set(assetId, {
          asset_id: assetId,
          asset_name: assetName,
          total_plays: 0,
          total_duration: 0,
          total_impressions: 0,
          data_points: 0,
          locations: new Set(),
          campaigns: new Set(),
          date_range: {
            start: row.data_date,
            end: row.data_date
          }
        });
      }

      const asset = assetMap.get(assetId)!;
      asset.total_plays += row.play_count || 0;
      asset.total_duration += row.play_duration || 0;
      asset.total_impressions += 1; // Each row represents an impression
      asset.data_points += 1;
      
      if (row.location) {
        asset.locations.add(row.location);
      }
      if (row.campaign_id) {
        asset.campaigns.add(row.campaign_id);
      }
      
      // Update date range
      const rowDate = new Date(row.data_date);
      const startDate = new Date(asset.date_range.start);
      const endDate = new Date(asset.date_range.end);
      
      if (rowDate < startDate) {
        asset.date_range.start = row.data_date;
      }
      if (rowDate > endDate) {
        asset.date_range.end = row.data_date;
      }
    });

    return Array.from(assetMap.values())
      .map(asset => ({
        ...asset,
        locations: Array.from(asset.locations),
        campaigns: Array.from(asset.campaigns),
        display_date_range: `${asset.date_range.start} - ${asset.date_range.end}`
      }))
      .sort((a, b) => b.total_plays - a.total_plays); // Sort by total plays descending
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
      const now = new Date();
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
  }, [user, fetchCSVAnalyticsData, fetchUserMediaAssets, loadS3Configuration, fetchS3CSVFiles, s3ConfigLoaded]);



  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  

  if (csvLoading || s3Loading || mediaAssetsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {csvLoading ? 'Loading analytics reports...' : 
             s3Loading ? 'Loading S3 CSV files...' : 
             'Loading media assets...'}
          </p>
        </div>
      </div>
    );
  }

  const hasCSVData = csvAnalyticsData && csvAnalyticsData.length > 0;
  const hasS3Data = s3AnalyticsData && s3AnalyticsData.length > 0;

  return (
      <div className="space-y-2">
        <div className='text-2xl font-semibold text-gray-900 dark:text-white mb-6'>
          Analytics
        </div>
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
                const config = await loadS3Configuration();
                if (config) {
                  await fetchS3CSVFiles(config);
                }
              }}
              disabled={csvLoading || s3Loading || mediaAssetsLoading}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-xs sm:text-sm"
            >
              <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${(csvLoading || s3Loading || mediaAssetsLoading) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>
  
        {/* Selected Period Analytics Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Analytics Summary - {dateRange}</h2>
          
          {/* CSV Data Summary for Selected Period */}
          {hasCSVData && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AWS S3 Imported Data - {dateRange}</h3>
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
  
          {/* S3 Data Summary for Selected Period */}
          
        </div>
  
        {/* Asset Analytics Section */}
        {hasS3Data && (
          <div className="mb-12">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Shows total plays and duration for each unique Asset ID from the selected number of CSV files
            </p>
            
            {(() => {
              const assetData = getAssetAnalytics();
              
              if (assetData.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No asset data found in the selected CSV files ({dateRange})</p>
                  </div>
                );
              }
  
              // Calculate totals
              const totalPlays = assetData.reduce((sum, asset) => sum + asset.total_plays, 0);
              const totalDuration = assetData.reduce((sum, asset) => sum + asset.total_duration, 0);
              
              
              return (
                <>
                  {/* Summary Stats */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {assetData.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Unique Assets</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatNumber(totalPlays)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Plays</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatNumber(totalDuration)}s
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Duration</div>
                      </div>
                    </div>
                  </div>
  
                  {/* Asset Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assetData.map((asset) => (
                    <div key={asset.asset_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="p-6 text-center">
                        {/* Large Plays Count - Similar to image style */}
                        <div className="flex flex-col items-center justify-center mb-6">
                          <div className="text-5xl font-extrabold text-teal-500 dark:text-teal-400 mb-2">
                            {formatNumber(asset.total_plays)}
                          </div>
                          <div className="text-lg text-gray-600 dark:text-gray-300">
                            Plays
                          </div>
                        </div>
  
                        {/* Asset Info */}
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                          Name: {asset.asset_name}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                          Period: {asset.display_date_range}
                        </p>
  
                        {/* Ad Preview - Show actual media if available */}
                        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                          {(() => {
                            // Debug: Log asset matching attempt
                            console.log('Asset Matching Debug:', {
                              assetName: asset.asset_name,
                              assetId: asset.asset_id,
                              userMediaAssets: userMediaAssets.map(ma => ({
                                id: ma.id,
                                file_name: ma.file_name,
                                file_type: ma.file_type
                              }))
                            });
                            
                            // Find matching media asset in database
                            const matchingAsset = userMediaAssets.find(mediaAsset => 
                              mediaAsset.file_name === asset.asset_name || 
                              mediaAsset.id === asset.asset_id
                            );
                            
                            console.log('Matching Asset Found:', matchingAsset);
                            
                            if (matchingAsset) {
                              // Get public URL for the media asset using file_path
                              const { data } = supabase.storage
                                .from('media-assets')
                                .getPublicUrl(matchingAsset.file_path);
                              
                              const mediaUrl = data?.publicUrl;
                              
                              console.log('Media URL Debug:', {
                                file_path: matchingAsset.file_path,
                                mediaUrl: mediaUrl,
                                file_type: matchingAsset.file_type
                              });
                              
                              if (mediaUrl) {
                                if (matchingAsset.file_type === 'image') {
                                  return (
                                    <img 
                                      src={mediaUrl} 
                                      alt={asset.asset_name}
                                      className="w-full h-full object-contain"
                                      style={{ objectFit: 'contain' }}
                                      onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  );
                                } else if (matchingAsset.file_type === 'video') {
                                  return (
                                    <video 
                                      src={mediaUrl} 
                                      className="w-full h-full object-contain"
                                      style={{ objectFit: 'contain' }}
                                      controls
                                      onError={(e) => {
                                        // Fallback to placeholder if video fails to load
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  );
                                }
                              }
                            }
                            
                            // Fallback to placeholder
                            return (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <div className="text-2xl font-bold mb-2">📺</div>
                                  <div className="text-lg font-semibold">Ad Preview</div>
                                  <div className="text-sm opacity-80">{asset.asset_name}</div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Overlay text - only show if no media found */}
                          {/* <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center p-4 pointer-events-none">
                            <span className="text-lg font-bold bg-black bg-opacity-50 px-3 py-2 rounded mb-2">
                              I AM YOUR AD
                            </span>
                            <span className="text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                              Asset: {asset.asset_name}
                            </span>
                          </div> */}
                        </div>
  
                        {/* Key Metrics - Total Count and Duration */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatNumber(asset.total_plays)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Total Plays</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">for this Asset ID</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatNumber(asset.total_duration)}s
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Total Duration</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">across time period</div>
                            </div>
                          </div>
                        </div>
  
                        {/* Additional Metrics */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <div className="text-center">
                            <div className="font-bold text-purple-600 dark:text-purple-400">
                              {formatNumber(asset.total_impressions)}
                            </div>
                            <div className="text-xs">Impressions</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-orange-600 dark:text-orange-400">
                              {asset.data_points}
                            </div>
                            <div className="text-xs">Data Points</div>
                          </div>
                        </div>
  
                        {/* Campaign and Location Info */}
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Campaigns: {asset.campaigns.length}</span>
                            <span>Locations: {asset.locations.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
  
        {/* Time Period Analytics Overview */}
        <div className="mb-12">
          {/* CSV Data Time Period Metrics */}
          {hasCSVData && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AWS S3 Imported Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { label: '1 Day', days: 1 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 },
                  { label: '90 Days', days: 90 }
                ].map(({ label, days }) => {
                  const metrics = calculateTimePeriodMetrics(csvAnalyticsData, days);
                  return (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{label}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Impressions:</span>
                          <span className="text-lg font-bold text-blue-600">{formatNumber(metrics.impressions)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Plays:</span>
                          <span className="text-lg font-bold text-green-600">{formatNumber(metrics.plays)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Clicks:</span>
                          <span className="text-lg font-bold text-purple-600">{formatNumber(metrics.clicks)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Completions:</span>
                          <span className="text-lg font-bold text-orange-600">{formatNumber(metrics.completions)}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {metrics.dataPoints} data points
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
  
        </div>
  
        {/* AWS S3 Analytics Overview */}
        {csvAnalyticsSummary && csvAnalyticsSummary.data_points_count > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Analytics Data from AWS S3</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {(() => {
                const filteredData = getFilteredCSVData();
                const totalImpressions = filteredData.reduce((sum, row) => sum + (row.impressions || 0), 0);
                const totalClicks = filteredData.reduce((sum, row) => sum + (row.clicks || 0), 0);
                const avgEngagementRate = filteredData.length > 0 ? 
                  filteredData.reduce((sum, row) => sum + (row.engagement_rate || 0), 0) / filteredData.length : 0;
                
                return (
                  <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Impressions</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                        {formatNumber(totalImpressions)}
                </div>
                      <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports - {dateRange}</p>
              </div>
  
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Clicks</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                        {formatNumber(totalClicks)}
                </div>
                      <p className="text-gray-600 dark:text-white text-sm">From AWS S3 daily imports - {dateRange}</p>
              </div>
  
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS S3 Engagement Rate</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                        {formatPercentage(avgEngagementRate)}%
                </div>
                      <p className="text-gray-600 dark:text-white text-sm">Average from AWS S3 data - {dateRange}</p>
              </div>
  
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Data Points</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                        {formatNumber(filteredData.length)}
                </div>
                      <p className="text-gray-600 dark:text-white text-sm">Records from AWS S3 - {dateRange}</p>
              </div>
                  </>
                );
              })()}
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
                      {getFilteredCSVData().map((row) => (
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
        
      </div>
    );
}

