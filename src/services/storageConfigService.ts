import { supabase } from '../lib/supabaseClient';

export interface StorageConfig {
  id: string;
  name: string;
  storage_type: 's3' | 'google_drive' | 'local';
  config_data: any;
  is_active: boolean;
  is_default: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface S3ConfigData {
  bucket_name: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
  folder_prefix?: string;
  file_format?: string;
}

export interface GoogleDriveConfigData {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  folder_id: string;
  file_format?: string;
}

export interface LocalConfigData {
  directory_path: string;
  file_format?: string;
}

export class StorageConfigService {
  // Get all storage configurations
  static async getAllStorageConfigs(): Promise<StorageConfig[]> {
    try {
      const { data, error } = await supabase
        .from('storage_configurations')
        .select('*')
        .order('storage_type', { ascending: true })
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching storage configurations:', error);
      return [];
    }
  }

  // Get active storage configuration by type
  static async getActiveStorageConfig(storageType?: 's3' | 'google_drive' | 'local'): Promise<StorageConfig | null> {
    try {
      const { data, error } = await supabase.rpc('get_active_storage_config', {
        p_storage_type: storageType || null
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching active storage configuration:', error);
      return null;
    }
  }

  // Get storage configuration by ID
  static async getStorageConfigById(id: string): Promise<StorageConfig | null> {
    try {
      const { data, error } = await supabase
        .from('storage_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching storage configuration by ID:', error);
      return null;
    }
  }

  // Create new storage configuration
  static async createStorageConfig(config: {
    name: string;
    storage_type: 's3' | 'google_drive' | 'local';
    config_data: any;
    description?: string;
    is_active?: boolean;
    is_default?: boolean;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('storage_configurations')
        .insert({
          ...config,
          is_active: config.is_active || false,
          is_default: config.is_default || false
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating storage configuration:', error);
      return null;
    }
  }

  // Update storage configuration
  static async updateStorageConfig(
    id: string,
    updates: {
      name?: string;
      config_data?: any;
      description?: string;
      is_active?: boolean;
      is_default?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('storage_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating storage configuration:', error);
      return false;
    }
  }

  // Delete storage configuration
  static async deleteStorageConfig(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('storage_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting storage configuration:', error);
      return false;
    }
  }

  // Set default storage configuration
  static async setDefaultStorageConfig(id: string, storageType: 's3' | 'google_drive' | 'local'): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('set_default_storage_config', {
        p_id: id,
        p_storage_type: storageType
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting default storage configuration:', error);
      return false;
    }
  }

  // Test storage configuration
  static async testStorageConfig(config: StorageConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      switch (config.storage_type) {
        case 's3':
          return await this.testS3Config(config.config_data as S3ConfigData);
        case 'google_drive':
          return await this.testGoogleDriveConfig(config.config_data as GoogleDriveConfigData);
        case 'local':
          return await this.testLocalConfig(config.config_data as LocalConfigData);
        default:
          return {
            success: false,
            message: 'Unsupported storage type'
          };
      }
    } catch (error) {
      console.error('Error testing storage configuration:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Test S3 configuration
  private static async testS3Config(config: S3ConfigData): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // In a real implementation, this would use AWS SDK to test the connection
      console.log('Testing S3 configuration:', config.bucket_name, config.region);
      
      // Mock test - in production, this would:
      // 1. Create an S3 client with the provided credentials
      // 2. Try to list objects in the bucket
      // 3. Verify permissions
      
      return {
        success: true,
        message: 'S3 connection test successful!',
        details: {
          bucket: config.bucket_name,
          region: config.region,
          access_key_id: config.access_key_id.substring(0, 8) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'S3 connection test failed'
      };
    }
  }

  // Test Google Drive configuration
  private static async testGoogleDriveConfig(config: GoogleDriveConfigData): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // In a real implementation, this would use Google Drive API to test the connection
      console.log('Testing Google Drive configuration:', config.folder_id);
      
      // Mock test - in production, this would:
      // 1. Create a Google Drive client with the provided credentials
      // 2. Try to access the specified folder
      // 3. Verify permissions
      
      return {
        success: true,
        message: 'Google Drive connection test successful!',
        details: {
          folder_id: config.folder_id,
          client_id: config.client_id.substring(0, 8) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Google Drive connection test failed'
      };
    }
  }

  // Test local configuration
  private static async testLocalConfig(config: LocalConfigData): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // In a real implementation, this would test file system access
      console.log('Testing local configuration:', config.directory_path);
      
      // Mock test - in production, this would:
      // 1. Check if the directory exists
      // 2. Verify read/write permissions
      // 3. Test file creation/deletion
      
      return {
        success: true,
        message: 'Local storage test successful!',
        details: {
          directory_path: config.directory_path
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Local storage test failed'
      };
    }
  }

  // Get storage configuration for CSV import
  static async getCSVImportStorageConfig(): Promise<StorageConfig | null> {
    try {
      // First try to get S3 config (preferred for CSV imports)
      let config = await this.getActiveStorageConfig('s3');
      
      // If no S3 config, try Google Drive
      if (!config) {
        config = await this.getActiveStorageConfig('google_drive');
      }
      
      // If still no config, try local
      if (!config) {
        config = await this.getActiveStorageConfig('local');
      }
      
      return config;
    } catch (error) {
      console.error('Error getting CSV import storage configuration:', error);
      return null;
    }
  }

  // List files in storage (for CSV import)
  static async listFilesInStorage(
    config: StorageConfig,
    prefix?: string
  ): Promise<string[]> {
    try {
      switch (config.storage_type) {
        case 's3':
          return await this.listS3Files(config.config_data as S3ConfigData, prefix);
        case 'google_drive':
          return await this.listGoogleDriveFiles(config.config_data as GoogleDriveConfigData, prefix);
        case 'local':
          return await this.listLocalFiles(config.config_data as LocalConfigData, prefix);
        default:
          return [];
      }
    } catch (error) {
      console.error('Error listing files in storage:', error);
      return [];
    }
  }

  // List S3 files
  private static async listS3Files(config: S3ConfigData, prefix?: string): Promise<string[]> {
    try {
      // In a real implementation, this would use AWS SDK
      console.log('Listing S3 files:', config.bucket_name, prefix);
      
      // Mock response - in production, this would make actual S3 API calls
      const filePrefix = prefix || config.folder_prefix || 'analytics/';
      return [
        `${filePrefix}csv-data-2024-01-15.csv`,
        `${filePrefix}csv-data-2024-01-16.csv`,
        `${filePrefix}csv-data-2024-01-17.csv`
      ];
    } catch (error) {
      console.error('Error listing S3 files:', error);
      return [];
    }
  }

  // List Google Drive files
  private static async listGoogleDriveFiles(config: GoogleDriveConfigData, prefix?: string): Promise<string[]> {
    try {
      // In a real implementation, this would use Google Drive API
      console.log('Listing Google Drive files:', config.folder_id, prefix);
      
      // Mock response - in production, this would make actual Google Drive API calls
      return [
        'csv-data-2024-01-15.csv',
        'csv-data-2024-01-16.csv',
        'csv-data-2024-01-17.csv'
      ];
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      return [];
    }
  }

  // List local files
  private static async listLocalFiles(config: LocalConfigData, prefix?: string): Promise<string[]> {
    try {
      // In a real implementation, this would use Node.js fs module
      console.log('Listing local files:', config.directory_path, prefix);
      
      // Mock response - in production, this would read from the file system
      return [
        'csv-data-2024-01-15.csv',
        'csv-data-2024-01-16.csv',
        'csv-data-2024-01-17.csv'
      ];
    } catch (error) {
      console.error('Error listing local files:', error);
      return [];
    }
  }

  // Download file from storage
  static async downloadFileFromStorage(
    config: StorageConfig,
    filePath: string
  ): Promise<string | null> {
    try {
      switch (config.storage_type) {
        case 's3':
          return await this.downloadS3File(config.config_data as S3ConfigData, filePath);
        case 'google_drive':
          return await this.downloadGoogleDriveFile(config.config_data as GoogleDriveConfigData, filePath);
        case 'local':
          return await this.downloadLocalFile(config.config_data as LocalConfigData, filePath);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error downloading file from storage:', error);
      return null;
    }
  }

  // Download S3 file
  private static async downloadS3File(config: S3ConfigData, filePath: string): Promise<string | null> {
    try {
      // In a real implementation, this would use AWS SDK to download the file
      console.log('Downloading S3 file:', filePath);
      
      // Mock CSV content - in production, this would download actual file content
      return `campaign_id,kiosk_id,location,data_date,impressions,clicks,plays,completions
campaign-123,kiosk-001,Murrieta Town Center,2024-01-15,150,25,20,15
campaign-123,kiosk-002,California Oaks Shopping Center,2024-01-15,200,35,30,22`;
    } catch (error) {
      console.error('Error downloading S3 file:', error);
      return null;
    }
  }

  // Download Google Drive file
  private static async downloadGoogleDriveFile(config: GoogleDriveConfigData, filePath: string): Promise<string | null> {
    try {
      // In a real implementation, this would use Google Drive API to download the file
      console.log('Downloading Google Drive file:', filePath);
      
      // Mock CSV content - in production, this would download actual file content
      return `campaign_id,kiosk_id,location,data_date,impressions,clicks,plays,completions
campaign-123,kiosk-001,Murrieta Town Center,2024-01-15,150,25,20,15
campaign-123,kiosk-002,California Oaks Shopping Center,2024-01-15,200,35,30,22`;
    } catch (error) {
      console.error('Error downloading Google Drive file:', error);
      return null;
    }
  }

  // Download local file
  private static async downloadLocalFile(config: LocalConfigData, filePath: string): Promise<string | null> {
    try {
      // In a real implementation, this would use Node.js fs module to read the file
      console.log('Downloading local file:', filePath);
      
      // Mock CSV content - in production, this would read actual file content
      return `campaign_id,kiosk_id,location,data_date,impressions,clicks,plays,completions
campaign-123,kiosk-001,Murrieta Town Center,2024-01-15,150,25,20,15
campaign-123,kiosk-002,California Oaks Shopping Center,2024-01-15,200,35,30,22`;
    } catch (error) {
      console.error('Error downloading local file:', error);
      return null;
    }
  }
}
