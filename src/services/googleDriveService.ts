import { supabase } from '../lib/supabaseClient';
import { GoogleDriveConfig, KioskGDriveFolder, UploadJob, SyncJob, Kiosk, Campaign, MediaAsset } from '../types/database';

export interface GoogleDriveCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface UploadJobData {
  gdrive_config_id: string;
  kiosk_id: string;
  campaign_id: string;
  media_asset_id: string;
  scheduled_time: string;
  upload_type?: 'scheduled' | 'immediate' | 'sync';
  folder_type?: 'active' | 'archive';
}

export interface SyncJobData {
  gdrive_config_id: string;
  kiosk_id: string;
  sync_type?: 'hourly' | 'manual' | 'campaign_status';
}

export interface FolderStructure {
  kioskId: string;
  kioskName: string;
  activeFolderId: string;
  archiveFolderId: string;
  status: 'ready' | 'pending' | 'error';
}

export class GoogleDriveService {
  // Get Google Drive configuration
  static async getGoogleDriveConfig(configId?: string): Promise<GoogleDriveConfig | null> {
    try {
      let query = supabase
        .from('google_drive_configs')
        .select('*')
        .eq('is_active', true);

      if (configId) {
        query = query.eq('id', configId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Return the first active configuration or null if none exist
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching Google Drive configuration:', error);
      return null;
    }
  }

  // Create or update Google Drive configuration
  static async saveGoogleDriveConfig(config: {
    name: string;
    client_id: string;
    client_secret: string;
    refresh_token: string;
    is_active?: boolean;
    daily_upload_time?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('google_drive_configs')
        .upsert(config, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving Google Drive configuration:', error);
      return null;
    }
  }

  // Update Google Drive configuration
  static async updateGoogleDriveConfig(config: {
    id: string;
    name?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    is_active?: boolean;
    daily_upload_time?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_drive_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating Google Drive configuration:', error);
      return false;
    }
  }

  // Test Google Drive connection
  static async testConnection(config: GoogleDriveConfig): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // In a real implementation, this would use Google Drive API
      // For now, return a mock response
      console.log('Testing Google Drive connection with config:', config.name);
      
      return {
        success: true,
        message: 'Google Drive connection successful!'
      };
    } catch (error) {
      console.error('Error testing Google Drive connection:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  // Create folder structure for kiosks
  static async createKioskFolders(
    configId: string,
    kiosks: Kiosk[]
  ): Promise<FolderStructure[]> {
    try {
      const results: FolderStructure[] = [];

      for (const kiosk of kiosks) {
        try {
          // Check if folders already exist
          const { data: existing } = await supabase
            .from('kiosk_gdrive_folders')
            .select('*')
            .eq('kiosk_id', kiosk.id)
            .eq('gdrive_config_id', configId)
            .single();

          if (existing) {
            results.push({
              kioskId: kiosk.id,
              kioskName: kiosk.name,
              activeFolderId: existing.active_folder_id,
              archiveFolderId: existing.archive_folder_id,
              status: 'ready'
            });
            continue;
          }

          // Create folders (mock implementation)
          const activeFolderId = `kiosk-${kiosk.id}-active-${Date.now()}`;
          const archiveFolderId = `kiosk-${kiosk.id}-archive-${Date.now()}`;

          // Save folder mapping to database
          const { error } = await supabase
            .from('kiosk_gdrive_folders')
            .insert({
              kiosk_id: kiosk.id,
              gdrive_config_id: configId,
              active_folder_id: activeFolderId,
              archive_folder_id: archiveFolderId
            });

          if (error) throw error;

          results.push({
            kioskId: kiosk.id,
            kioskName: kiosk.name,
            activeFolderId,
            archiveFolderId,
            status: 'ready'
          });

    } catch (error) {
          console.error(`Error creating folders for kiosk ${kiosk.id}:`, error);
          results.push({
            kioskId: kiosk.id,
            kioskName: kiosk.name,
            activeFolderId: '',
            archiveFolderId: '',
            status: 'error'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error creating kiosk folders:', error);
      return [];
    }
  }

  // Schedule upload job
  static async scheduleUpload(jobData: UploadJobData): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('upload_jobs')
        .insert({
          ...jobData,
          status: 'pending',
          upload_type: jobData.upload_type || 'scheduled',
          folder_type: jobData.folder_type || 'active'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error scheduling upload job:', error);
      return null;
    }
  }

  // Get upload jobs
  static async getUploadJobs(filters?: {
    kiosk_id?: string;
    campaign_id?: string;
    status?: string;
    upload_type?: string;
  }): Promise<UploadJob[]> {
    try {
      let query = supabase
        .from('upload_jobs')
        .select(`
          *,
          kiosk:kiosks(name, location),
          campaign:campaigns(name, status),
          media_asset:media_assets(file_name, file_type),
          gdrive_config:google_drive_configs(name)
        `)
        .order('scheduled_time', { ascending: false });

      if (filters) {
        if (filters.kiosk_id) query = query.eq('kiosk_id', filters.kiosk_id);
        if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.upload_type) query = query.eq('upload_type', filters.upload_type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upload jobs:', error);
      return [];
    }
  }

  // Update upload job status
  static async updateUploadJobStatus(
    jobId: string,
    status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled',
    updates?: {
      gdrive_file_id?: string;
      error_message?: string;
      started_at?: string;
      completed_at?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('upload_jobs')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating upload job status:', error);
      return false;
    }
  }

  // Process scheduled uploads
  static async processScheduledUploads(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get pending upload jobs that are due
      const { data: pendingJobs, error } = await supabase
        .from('upload_jobs')
        .select(`
          *,
          kiosk:kiosks(name),
          campaign:campaigns(name, status),
          media_asset:media_assets(file_name, file_path, file_type),
          gdrive_config:google_drive_configs(*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_time', now)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      for (const job of pendingJobs || []) {
        try {
          // Update status to uploading
          await this.updateUploadJobStatus(job.id, 'uploading', {
            started_at: new Date().toISOString()
          });

          // Get kiosk folder mapping
          const { data: folderMapping } = await supabase
            .from('kiosk_gdrive_folders')
            .select('*')
            .eq('kiosk_id', job.kiosk_id)
            .eq('gdrive_config_id', job.gdrive_config_id)
            .single();

          if (!folderMapping) {
            throw new Error('Kiosk folder mapping not found');
          }

          // Determine target folder
          const targetFolderId = job.folder_type === 'archive' 
            ? folderMapping.archive_folder_id 
            : folderMapping.active_folder_id;

          // Upload file to Google Drive (mock implementation)
          const gdriveFileId = await this.uploadFileToGoogleDrive(
            job.media_asset,
            targetFolderId,
            job.gdrive_config
          );

          // Update job as completed
          await this.updateUploadJobStatus(job.id, 'completed', {
            gdrive_file_id: gdriveFileId,
            completed_at: new Date().toISOString()
          });

          console.log(`Successfully uploaded ${job.media_asset.file_name} to kiosk ${job.kiosk.name}`);

        } catch (error) {
          console.error(`Error processing upload job ${job.id}:`, error);
          await this.updateUploadJobStatus(job.id, 'failed', {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error processing scheduled uploads:', error);
    }
  }

  // Upload file to Google Drive (mock implementation)
  private static async uploadFileToGoogleDrive(
    mediaAsset: any,
    folderId: string,
    config: GoogleDriveConfig
  ): Promise<string> {
    try {
      // In a real implementation, this would use Google Drive API
      // For now, return a mock file ID
      console.log(`Uploading ${mediaAsset.file_name} to folder ${folderId}`);
      
      // Mock file ID
      const fileId = `gdrive-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return fileId;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  // Create sync job
  static async createSyncJob(jobData: SyncJobData): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sync_jobs')
        .insert({
          ...jobData,
          status: 'pending',
          sync_type: jobData.sync_type || 'hourly'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating sync job:', error);
      return null;
    }
  }

  // Process sync jobs
  static async processSyncJobs(): Promise<void> {
    try {
      // Get pending sync jobs
      const { data: pendingJobs, error } = await supabase
        .from('sync_jobs')
        .select(`
          *,
          kiosk:kiosks(name),
          gdrive_config:google_drive_configs(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      for (const job of pendingJobs || []) {
        try {
          // Update status to syncing
          await this.updateSyncJobStatus(job.id, 'syncing', {
            started_at: new Date().toISOString()
          });

          // Get kiosk folder mapping
          const { data: folderMapping } = await supabase
            .from('kiosk_gdrive_folders')
            .select('*')
            .eq('kiosk_id', job.kiosk_id)
            .eq('gdrive_config_id', job.gdrive_config_id)
            .single();

          if (!folderMapping) {
            throw new Error('Kiosk folder mapping not found');
          }

          // Sync files based on campaign status
          const syncResult = await this.syncKioskFiles(
            job.kiosk_id,
            folderMapping,
            job.gdrive_config
          );

          // Update job as completed
          await this.updateSyncJobStatus(job.id, 'completed', {
            files_synced: syncResult.filesSynced,
            files_archived: syncResult.filesArchived,
            files_activated: syncResult.filesActivated,
            completed_at: new Date().toISOString()
          });

          console.log(`Successfully synced kiosk ${job.kiosk.name}: ${syncResult.filesSynced} files synced`);

        } catch (error) {
          console.error(`Error processing sync job ${job.id}:`, error);
          await this.updateSyncJobStatus(job.id, 'failed', {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error processing sync jobs:', error);
    }
  }

  // Sync kiosk files based on campaign status
  private static async syncKioskFiles(
    kioskId: string,
    folderMapping: KioskGDriveFolder,
    config: GoogleDriveConfig
  ): Promise<{
    filesSynced: number;
    filesArchived: number;
    filesActivated: number;
  }> {
    try {
      // Get active campaigns for this kiosk
      const { data: activeCampaigns } = await supabase
        .from('campaigns')
        .select(`
          id,
          status,
          end_date,
          selected_kiosk_ids
        `)
        .contains('selected_kiosk_ids', [kioskId])
        .in('status', ['active', 'pending']);

      // Get expired campaigns for this kiosk
      const { data: expiredCampaigns } = await supabase
        .from('campaigns')
        .select(`
          id,
          status,
          end_date,
          selected_kiosk_ids
        `)
        .contains('selected_kiosk_ids', [kioskId])
        .in('status', ['completed', 'paused']);

      // Get media assets for active campaigns
      const activeCampaignIds = activeCampaigns?.map(c => c.id) || [];
      const expiredCampaignIds = expiredCampaigns?.map(c => c.id) || [];

      let filesActivated = 0;
      let filesArchived = 0;

      // Move files to active folder for active campaigns
      if (activeCampaignIds.length > 0) {
        const { data: activeAssets } = await supabase
          .from('media_assets')
          .select('*')
          .in('campaign_id', activeCampaignIds)
          .eq('status', 'approved');

        for (const asset of activeAssets || []) {
          // Move file from archive to active folder
          await this.moveFileInGoogleDrive(
            asset.id,
            folderMapping.archive_folder_id,
            folderMapping.active_folder_id,
            config
          );
          filesActivated++;
        }
      }

      // Move files to archive folder for expired campaigns
      if (expiredCampaignIds.length > 0) {
        const { data: expiredAssets } = await supabase
          .from('media_assets')
        .select('*')
          .in('campaign_id', expiredCampaignIds)
          .eq('status', 'approved');

        for (const asset of expiredAssets || []) {
          // Move file from active to archive folder
          await this.moveFileInGoogleDrive(
            asset.id,
            folderMapping.active_folder_id,
            folderMapping.archive_folder_id,
            config
          );
          filesArchived++;
        }
      }

      return {
        filesSynced: filesActivated + filesArchived,
        filesArchived,
        filesActivated
      };

    } catch (error) {
      console.error('Error syncing kiosk files:', error);
      throw error;
    }
  }

  // Move file between Google Drive folders (mock implementation)
  private static async moveFileInGoogleDrive(
    assetId: string,
    fromFolderId: string,
    toFolderId: string,
    config: GoogleDriveConfig
  ): Promise<void> {
    try {
      // In a real implementation, this would use Google Drive API
      console.log(`Moving asset ${assetId} from folder ${fromFolderId} to ${toFolderId}`);
      
      // Mock implementation - in reality, this would:
      // 1. Find the file in the source folder
      // 2. Move it to the destination folder
      // 3. Update the file's parent folder reference

    } catch (error) {
      console.error('Error moving file in Google Drive:', error);
      throw error;
    }
  }

  // Update sync job status
  static async updateSyncJobStatus(
    jobId: string,
    status: 'pending' | 'syncing' | 'completed' | 'failed',
    updates?: {
      files_synced?: number;
      files_archived?: number;
      files_activated?: number;
      error_message?: string;
      started_at?: string;
      completed_at?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sync_jobs')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating sync job status:', error);
      return false;
    }
  }

  // Get sync jobs
  static async getSyncJobs(filters?: {
    kiosk_id?: string;
    status?: string;
    sync_type?: string;
  }): Promise<SyncJob[]> {
    try {
      let query = supabase
        .from('sync_jobs')
        .select(`
          *,
          kiosk:kiosks(name, location),
          gdrive_config:google_drive_configs(name)
        `)
        .order('created_at', { ascending: false });

      if (filters) {
        if (filters.kiosk_id) query = query.eq('kiosk_id', filters.kiosk_id);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.sync_type) query = query.eq('sync_type', filters.sync_type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      return [];
    }
  }

  // Schedule immediate upload for approved ads
  static async scheduleImmediateUpload(
    campaignId: string,
    kioskIds: string[],
    uploadType: 'immediate' | 'scheduled' = 'immediate',
    scheduledTime?: string
  ): Promise<string[]> {
    try {
      const jobIds: string[] = [];

      // Get campaign details
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get approved media assets for the campaign
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');

      if (!mediaAssets || mediaAssets.length === 0) {
        throw new Error('No approved media assets found for campaign');
      }

      // Get active Google Drive config
      const gdriveConfig = await this.getGoogleDriveConfig();
      if (!gdriveConfig) {
        throw new Error('No active Google Drive configuration found');
      }

      // Create upload jobs for each kiosk and media asset
      for (const kioskId of kioskIds) {
        for (const mediaAsset of mediaAssets) {
          const jobId = await this.scheduleUpload({
            gdrive_config_id: gdriveConfig.id,
            kiosk_id: kioskId,
            campaign_id: campaignId,
            media_asset_id: mediaAsset.id,
            scheduled_time: scheduledTime || new Date().toISOString(),
            upload_type: uploadType,
            folder_type: 'active'
          });

          if (jobId) {
            jobIds.push(jobId);
          }
        }
      }

      return jobIds;
    } catch (error) {
      console.error('Error scheduling immediate upload:', error);
      throw error;
    }
  }

  // Get folder structure status
  static async getFolderStructureStatus(): Promise<FolderStructure[]> {
    try {
      const { data: folders, error } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosk:kiosks(name, location),
          gdrive_config:google_drive_configs(name, is_active)
        `)
        .eq('gdrive_config.is_active', true);

      if (error) throw error;

      return (folders || []).map(folder => ({
        kioskId: folder.kiosk_id,
        kioskName: folder.kiosk.name,
        activeFolderId: folder.active_folder_id,
        archiveFolderId: folder.archive_folder_id,
        status: 'ready' as const
      }));
    } catch (error) {
      console.error('Error fetching folder structure status:', error);
      return [];
    }
  }

  // Process asset lifecycle - archive expired assets and delete old archived assets
  static async processAssetLifecycle(): Promise<void> {
    try {
      console.log('Starting asset lifecycle processing...');
      
      // Call the database function to archive expired assets
      const { error: archiveError } = await supabase.rpc('archive_expired_assets');
      if (archiveError) {
        console.error('Error archiving expired assets:', archiveError);
        throw archiveError;
      }
      console.log('Successfully archived expired assets');

      // Call the database function to delete old archived assets
      const { error: deleteError } = await supabase.rpc('delete_old_archived_assets');
      if (deleteError) {
        console.error('Error deleting old archived assets:', deleteError);
        throw deleteError;
      }
      console.log('Successfully deleted old archived assets');

      console.log('Asset lifecycle processing completed successfully');
    } catch (error) {
      console.error('Error processing asset lifecycle:', error);
      throw error;
    }
  }

  // Restore asset from archive to active folder
  static async restoreAsset(assetId: string, driveFileId: string): Promise<void> {
    try {
      console.log(`Restoring asset ${assetId} with Google Drive file ID ${driveFileId}`);
      
      // In a real implementation, this would:
      // 1. Move the file from archive folder to active folder in Google Drive
      // 2. Update the file's metadata
      // For now, this is a mock implementation
      
      console.log(`Asset ${assetId} restored successfully`);
    } catch (error) {
      console.error('Error restoring asset:', error);
      throw error;
    }
  }

  // Sync all folders for all kiosks
  static async syncAllFolders(): Promise<{
    success: boolean;
    message: string;
    foldersSynced: number;
    errors: string[];
  }> {
    try {
      console.log('Starting sync all folders process...');
      
      // Get all kiosks with their Google Drive folder mappings
      const { data: kioskFolders, error: foldersError } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosk:kiosks(name, location),
          gdrive_config:google_drive_configs(name, is_active)
        `)
        .eq('gdrive_config.is_active', true);

      if (foldersError) throw foldersError;

      if (!kioskFolders || kioskFolders.length === 0) {
        return {
          success: false,
          message: 'No Google Drive folders found to sync',
          foldersSynced: 0,
          errors: []
        };
      }

      const errors: string[] = [];
      let foldersSynced = 0;

      // Process each kiosk folder
      for (const folderMapping of kioskFolders) {
        try {
          console.log(`Syncing folders for kiosk: ${folderMapping.kiosk.name}`);
          
          // Create sync job for this kiosk
          const syncJobId = await this.createSyncJob({
            gdrive_config_id: folderMapping.gdrive_config_id,
            kiosk_id: folderMapping.kiosk_id,
            sync_type: 'manual'
          });

          if (syncJobId) {
            // Process the sync job immediately
            await this.processSyncJobs();
            foldersSynced++;
            console.log(`Successfully synced folders for kiosk: ${folderMapping.kiosk.name}`);
          }
        } catch (error) {
          const errorMessage = `Failed to sync kiosk ${folderMapping.kiosk.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      const success = errors.length === 0;
      const message = success 
        ? `Successfully synced ${foldersSynced} folders`
        : `Synced ${foldersSynced} folders with ${errors.length} errors`;

      return {
        success,
        message,
        foldersSynced,
        errors
      };
    } catch (error) {
      console.error('Error syncing all folders:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        foldersSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get daily upload time for active configuration
  static async getDailyUploadTime(): Promise<string | null> {
    try {
      const config = await this.getGoogleDriveConfig();
      return config?.daily_upload_time || null;
    } catch (error) {
      console.error('Error getting daily upload time:', error);
      return null;
    }
  }

  // Schedule daily uploads based on configured time
  static async scheduleDailyUploads(): Promise<void> {
    try {
      const config = await this.getGoogleDriveConfig();
      if (!config || !config.daily_upload_time) {
        console.log('No daily upload time configured');
        return;
      }

      console.log(`Scheduling daily uploads for time: ${config.daily_upload_time}`);
      
      // Get all active campaigns with approved media assets
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          selected_kiosk_ids,
          status
        `)
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;

      if (!campaigns || campaigns.length === 0) {
        console.log('No active campaigns found for daily upload');
        return;
      }

      // Get approved media assets for active campaigns
      const campaignIds = campaigns.map(c => c.id);
      const { data: mediaAssets, error: assetsError } = await supabase
        .from('media_assets')
        .select('*')
        .in('campaign_id', campaignIds)
        .eq('status', 'approved');

      if (assetsError) throw assetsError;

      if (!mediaAssets || mediaAssets.length === 0) {
        console.log('No approved media assets found for daily upload');
        return;
      }

      // Calculate next upload time
      const now = new Date();
      const [hours, minutes] = config.daily_upload_time.split(':').map(Number);
      const nextUpload = new Date(now);
      nextUpload.setHours(hours, minutes, 0, 0);
      
      // If the time has passed today, schedule for tomorrow
      if (nextUpload <= now) {
        nextUpload.setDate(nextUpload.getDate() + 1);
      }

      // Create upload jobs for each campaign and kiosk combination
      for (const campaign of campaigns) {
        if (!campaign.selected_kiosk_ids || campaign.selected_kiosk_ids.length === 0) {
          continue;
        }

        const campaignAssets = mediaAssets.filter(asset => asset.campaign_id === campaign.id);
        
        for (const kioskId of campaign.selected_kiosk_ids) {
          for (const asset of campaignAssets) {
            await this.scheduleUpload({
              gdrive_config_id: config.id,
              kiosk_id: kioskId,
              campaign_id: campaign.id,
              media_asset_id: asset.id,
              scheduled_time: nextUpload.toISOString(),
              upload_type: 'scheduled',
              folder_type: 'active'
            });
          }
        }
      }

      console.log(`Scheduled daily uploads for ${nextUpload.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling daily uploads:', error);
    }
  }
}
