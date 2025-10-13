import { S3Service } from './s3Service';
import { AWSS3Service } from './awsS3Service';

export interface ScheduledAnalyticsConfig {
  enabled: boolean;
  timezone: string;
  hour: number;
  minute: number;
  bucketName: string;
  prefix: string;
}

export class ScheduledAnalyticsService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  // Default configuration for 1:15 AM LA time
  private static defaultConfig: ScheduledAnalyticsConfig = {
    enabled: true,
    timezone: 'America/Los_Angeles',
    hour: 1,
    minute: 15,
    bucketName: 'optisignsreports',
    prefix: 'reports/'
  };

  /**
   * Start the scheduled analytics fetching
   */
  static async startScheduledFetching(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduled analytics fetching is already running');
      return;
    }

    console.log('Starting scheduled analytics fetching...');
    this.isRunning = true;

    // Check every minute if it's time to fetch
    this.intervalId = setInterval(async () => {
      await this.checkAndFetchIfScheduled();
    }, 60000); // Check every minute

    // Also check immediately
    await this.checkAndFetchIfScheduled();
  }

  /**
   * Stop the scheduled analytics fetching
   */
  static stopScheduledFetching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Stopped scheduled analytics fetching');
  }

  /**
   * Check if it's time to fetch and execute if so
   */
  private static async checkAndFetchIfScheduled(): Promise<void> {
    try {
      const now = new Date();
      const laTime = new Date(now.toLocaleString("en-US", { timeZone: this.defaultConfig.timezone }));
      
      const currentHour = laTime.getHours();
      const currentMinute = laTime.getMinutes();
      
      // Check if it's the scheduled time (1:15 AM LA time)
      if (currentHour === this.defaultConfig.hour && currentMinute === this.defaultConfig.minute) {
        console.log('Scheduled time reached, fetching analytics data...');
        await this.fetchAnalyticsData();
      }
    } catch (error) {
      console.error('Error in scheduled analytics check:', error);
    }
  }

  /**
   * Fetch analytics data from S3
   */
  static async fetchAnalyticsData(): Promise<void> {
    try {
      console.log('Starting scheduled analytics data fetch...');
      
      // Get S3 configuration
      const s3Config = await S3Service.getS3Configuration();
      if (!s3Config) {
        console.error('No S3 configuration found');
        return;
      }

      const awsConfig = {
        bucketName: s3Config.bucket_name,
        region: s3Config.region,
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key
      };

      // List all CSV files in the reports/ folder
      const objects = await AWSS3Service.listObjects(awsConfig, this.defaultConfig.prefix, 1000);
      const csvFiles = objects.filter(obj => obj.key.endsWith('.csv'));
      
      console.log(`Found ${csvFiles.length} CSV files in S3`);

      // Process each CSV file
      let totalRecords = 0;
      for (const file of csvFiles) {
        try {
          console.log(`Processing file: ${file.key}`);
          
          // Download and parse CSV
          const csvContent = await AWSS3Service.getObjectAsText(awsConfig, file.key);
          const parsedData = AWSS3Service.parseCSV(csvContent);
          
          console.log(`Parsed ${parsedData.length} records from ${file.key}`);
          totalRecords += parsedData.length;
          
          // Here you could save the data to your database or process it further
          // For now, we'll just log the data
          console.log('Sample data:', parsedData.slice(0, 3));
          
        } catch (error) {
          console.error(`Error processing file ${file.key}:`, error);
        }
      }

      console.log(`Scheduled analytics fetch completed. Total records processed: ${totalRecords}`);
      
    } catch (error) {
      console.error('Error in scheduled analytics fetch:', error);
    }
  }

  /**
   * Manually trigger analytics fetch (for testing)
   */
  static async triggerManualFetch(): Promise<void> {
    console.log('Manual analytics fetch triggered');
    await this.fetchAnalyticsData();
  }

  /**
   * Get the next scheduled fetch time
   */
  static getNextScheduledTime(): Date {
    const now = new Date();
    const laTime = new Date(now.toLocaleString("en-US", { timeZone: this.defaultConfig.timezone }));
    
    // Calculate next occurrence of 1:15 AM LA time
    const nextFetch = new Date(laTime);
    nextFetch.setHours(this.defaultConfig.hour, this.defaultConfig.minute, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextFetch <= laTime) {
      nextFetch.setDate(nextFetch.getDate() + 1);
    }
    
    return nextFetch;
  }

  /**
   * Get current status of scheduled fetching
   */
  static getStatus(): {
    isRunning: boolean;
    nextScheduledTime: Date;
    config: ScheduledAnalyticsConfig;
  } {
    return {
      isRunning: this.isRunning,
      nextScheduledTime: this.getNextScheduledTime(),
      config: this.defaultConfig
    };
  }
}

// Auto-start the service when the module is imported
if (typeof window === 'undefined') {
  // Only start in server-side environment
  ScheduledAnalyticsService.startScheduledFetching().catch(console.error);
}
