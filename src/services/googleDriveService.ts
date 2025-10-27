import { supabase } from '../lib/supabaseClient';
import { GoogleDriveConfig, KioskGDriveFolder, UploadJob, SyncJob } from '../types/database';
import { GoogleDriveApiServiceBrowser as GoogleDriveApiService } from './googleDriveApiServiceBrowser';
import { getCurrentCaliforniaTime } from '../utils/dateUtils';

// Define Kiosk interface since it's not in database types
export interface Kiosk {
  id: string;
  name: string;
  location?: string;
  city?: string;
  state?: string;
  status?: string;
}

// Extend GoogleDriveConfig to include daily_upload_time
export interface ExtendedGoogleDriveConfig extends GoogleDriveConfig {
  daily_upload_time?: string;
}

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
  folder_type?: 'scheduled' | 'active' | 'archive';
}

export interface SyncJobData {
  gdrive_config_id: string;
  kiosk_id: string;
  sync_type?: 'hourly' | 'manual' | 'campaign_status';
}

export interface FolderStructure {
  id: string;
  kioskId: string;
  kioskName: string;
  activeFolderId: string;
  archiveFolderId: string;
  scheduledFolderId?: string;
  status: 'ready' | 'pending' | 'error';
  folderPath?: string;
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
      console.log('Testing Google Drive connection with config:', config.name);
      
      // Use the real Google Drive API to test connection
      const result = await GoogleDriveApiService.testConnection(config);
      return result;
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
      // Use Edge Function for server-side Drive folder creation for reliability
      const { data, error } = await supabase.functions.invoke('gdrive-folder-setup', {
        body: {
          gdrive_config_id: configId,
          kiosks: kiosks.map(k => ({ id: k.id, name: k.name }))
        }
      });

      if (error) throw error;

      const results: FolderStructure[] = (data?.results || []).map((r: any) => ({
        id: r.kioskId ?? `kiosk-${Date.now()}`,
        kioskId: r.kioskId,
        kioskName: r.kioskName,
        activeFolderId: r.activeFolderId,
        archiveFolderId: r.archiveFolderId,
        scheduledFolderId: r.scheduledFolderId,
        status: (r.status || 'ready') as 'ready' | 'pending' | 'error',
        folderPath: r.folderPath
      }));

      return results;
    } catch (error) {
      console.error('Error creating kiosk folders:', error);
      return [];
    }
  }

  // Ensure scheduled folders exist for all kiosks
  static async ensureScheduledFoldersExist(): Promise<void> {
    try {
      console.log('Ensuring scheduled folders exist for all kiosks...');
      
      // Get active Google Drive configuration
      const gdriveConfig = await this.getGoogleDriveConfig();
      if (!gdriveConfig) {
        throw new Error('No active Google Drive configuration found');
      }

      // Get all kiosks
      const { data: kiosks, error: kiosksError } = await supabase
        .from('kiosks')
        .select('id, name, location')
        .order('name');

      if (kiosksError) throw kiosksError;

      if (!kiosks || kiosks.length === 0) {
        console.log('No kiosks found');
        return;
      }

      console.log(`Found ${kiosks.length} kiosks`);

      // Get existing kiosk folder mappings
      const { data: existingMappings, error: mappingsError } = await supabase
        .from('kiosk_gdrive_folders')
        .select('kiosk_id, scheduled_folder_id')
        .eq('gdrive_config_id', gdriveConfig.id);

      if (mappingsError) throw mappingsError;

      // Find kiosks that need scheduled folders
      const kiosksNeedingScheduledFolders = kiosks.filter(kiosk => {
        const mapping = existingMappings?.find(m => m.kiosk_id === kiosk.id);
        return !mapping || !mapping.scheduled_folder_id;
      });

      if (kiosksNeedingScheduledFolders.length === 0) {
        console.log('All kiosks already have scheduled folders');
        return;
      }

      console.log(`Found ${kiosksNeedingScheduledFolders.length} kiosks missing scheduled folders`);

      // Create scheduled folders using the edge function
      const { data, error } = await supabase.functions.invoke('gdrive-folder-setup', {
        body: {
          gdrive_config_id: gdriveConfig.id,
          kiosks: kiosksNeedingScheduledFolders.map(k => ({ id: k.id, name: k.name })),
          create_scheduled_only: true
        }
      });

      if (error) {
        console.error('Error calling gdrive-folder-setup edge function:', error);
        throw error;
      }

      if (data?.results) {
        console.log(`Successfully created scheduled folders for ${data.results.length} kiosks`);
        data.results.forEach((result: any) => {
          console.log(`Created scheduled folder for kiosk: ${result.kioskName} (ID: ${result.scheduledFolderId})`);
        });
      } else {
        console.log('No results returned from edge function');
        console.log('Edge function response:', data);
      }
    } catch (error) {
      console.error('Error ensuring scheduled folders exist:', error);
      throw error;
    }
  }

  // Create scheduled folders for specific kiosks during campaign approval
  static async ensureScheduledFoldersForKiosks(kioskIds: string[]): Promise<void> {
    try {
      console.log(`Ensuring scheduled folders exist for ${kioskIds.length} kiosks...`);
      
      // Get Google Drive configuration
      const gdriveConfig = await this.getGoogleDriveConfig();
      if (!gdriveConfig) {
        throw new Error('No active Google Drive configuration found');
      }

      // Get kiosk folder mappings for the specified kiosks
      const { data: kioskFolders, error: foldersError } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosks!kiosk_id(name, location)
        `)
        .eq('gdrive_config_id', gdriveConfig.id)
        .in('kiosk_id', kioskIds);

      if (foldersError) {
        console.error('Error fetching kiosk folder mappings:', foldersError);
        throw foldersError;
      }

      console.log(`Found ${kioskFolders?.length || 0} kiosk folder mappings for the specified kiosks`);

      if (!kioskFolders || kioskFolders.length === 0) {
        console.log('No kiosk folder mappings found for the specified kiosks');
        return;
      }

      // Check which kiosks are missing scheduled folders
      const kiosksNeedingScheduledFolders = kioskFolders.filter(folder => !folder.scheduled_folder_id);
      
      console.log(`Kiosk folder status:`, kioskFolders.map(f => ({
        kioskId: f.kiosk_id,
        kioskName: f.kiosks?.name,
        hasScheduledFolder: !!f.scheduled_folder_id,
        scheduledFolderId: f.scheduled_folder_id
      })));
      
      if (kiosksNeedingScheduledFolders.length === 0) {
        console.log('All specified kiosks already have scheduled folders');
        return;
      }

      console.log(`Found ${kiosksNeedingScheduledFolders.length} kiosks missing scheduled folders:`, 
        kiosksNeedingScheduledFolders.map(f => f.kiosks?.name));

      // Create scheduled folders for kiosks that don't have them
      for (const folderMapping of kiosksNeedingScheduledFolders) {
        try {
          const kiosk = { id: folderMapping.kiosk_id, name: folderMapping.kiosks?.name || 'Unknown' };
          
          // Create only the scheduled folder using the edge function
          const { data, error } = await supabase.functions.invoke('gdrive-folder-setup', {
            body: {
              gdrive_config_id: gdriveConfig.id,
              kiosks: [{ id: kiosk.id, name: kiosk.name }],
              create_scheduled_only: true
            }
          });

          if (error) {
            console.error(`Error creating scheduled folder for kiosk ${kiosk.name}:`, error);
            continue;
          }

          if (data?.results && data.results.length > 0 && data.results[0].scheduledFolderId) {
            // Update the folder mapping with the scheduled folder ID
            await supabase
              .from('kiosk_gdrive_folders')
              .update({ 
                scheduled_folder_id: data.results[0].scheduledFolderId,
                updated_at: new Date().toISOString()
              })
              .eq('id', folderMapping.id);
            
            console.log(`Created scheduled folder for kiosk: ${kiosk.name}`);
          }
        } catch (error) {
          console.error(`Error creating scheduled folder for kiosk ${folderMapping.kiosks?.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error ensuring scheduled folders for kiosks:', error);
      throw error;
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
          folder_type: jobData.folder_type || 'scheduled'
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
          kiosks!kiosk_id(name, location),
          campaigns!campaign_id(name, status),
          media_assets!media_asset_id(file_name, file_type),
          google_drive_configs!gdrive_config_id(name)
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
          kiosks!kiosk_id(name),
          campaigns!campaign_id(name, status),
          media_assets!media_asset_id(file_name, file_path, file_type),
          google_drive_configs!gdrive_config_id(*)
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
            job.media_assets,
            targetFolderId,
            job.google_drive_configs
          );

          // Update job as completed
          await this.updateUploadJobStatus(job.id, 'completed', {
            gdrive_file_id: gdriveFileId,
            completed_at: new Date().toISOString()
          });

          console.log(`Successfully uploaded ${job.media_assets?.file_name || 'Unknown'} to kiosk ${job.kiosks?.name || 'Unknown'}`);

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

  // Upload file to Google Drive using real API
  private static async uploadFileToGoogleDrive(
    mediaAsset: any,
    folderId: string,
    config: GoogleDriveConfig
  ): Promise<string> {
    try {
      console.log(`Uploading ${mediaAsset.file_name} to folder ${folderId}`);
      
      // Determine MIME type based on file extension
      const getMimeType = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'mp4': 'video/mp4',
          'avi': 'video/avi',
          'mov': 'video/quicktime',
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return mimeTypes[extension || ''] || 'application/octet-stream';
      };

      const mimeType = getMimeType(mediaAsset.file_name);

      // Resolve a URL or data source for the asset, with multiple fallbacks
      let resolvedUrl: string | null = null;
      const metadataPublicUrl: string | undefined = mediaAsset?.metadata?.publicUrl;

      if (typeof mediaAsset.file_url === 'string' && mediaAsset.file_url) {
        resolvedUrl = mediaAsset.file_url;
      } else if (typeof metadataPublicUrl === 'string' && metadataPublicUrl) {
        resolvedUrl = metadataPublicUrl;
      } else if (typeof mediaAsset.file_path === 'string' && mediaAsset.file_path) {
        // If file_path is already a full URL, use it directly; otherwise, derive Supabase public URL
        if (/^https?:\/\//i.test(mediaAsset.file_path)) {
          resolvedUrl = mediaAsset.file_path;
        } else {
          const { data: urlData } = supabase.storage
            .from('media-assets')
            .getPublicUrl(mediaAsset.file_path);
          resolvedUrl = urlData?.publicUrl || null;
        }
      }

      let fileBuffer: ArrayBuffer;
      if (resolvedUrl) {
        const response = await fetch(resolvedUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        fileBuffer = await response.arrayBuffer();
      } else if (mediaAsset.file_data) {
        // Fallback: base64
        const binaryString = atob(mediaAsset.file_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
      } else {
        throw new Error('No accessible URL or data for upload');
      }
      
      // Upload file using real Google Drive API
      const uploadedFile = await GoogleDriveApiService.uploadFileFromBuffer(
        config,
        fileBuffer,
        mediaAsset.file_name,
        mimeType,
        folderId
      );
      
      console.log(`Successfully uploaded ${mediaAsset.file_name} with ID: ${uploadedFile.id}`);
      return uploadedFile.id;
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
          kiosks!kiosk_id(name),
          google_drive_configs!gdrive_config_id(*)
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
            job.google_drive_configs
          );

          // Update job as completed
          await this.updateSyncJobStatus(job.id, 'completed', {
            files_synced: syncResult.filesSynced,
            files_archived: syncResult.filesArchived,
            files_activated: syncResult.filesActivated,
            completed_at: new Date().toISOString()
          });

          console.log(`Successfully synced kiosk ${job.kiosks?.name || 'Unknown'}: ${syncResult.filesSynced} files synced`);

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
      const now = getCurrentCaliforniaTime();
      
      // Get all campaigns for this kiosk (regardless of status)
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select(`
          id,
          status,
          start_date,
          end_date,
          selected_kiosk_ids
        `)
        .contains('selected_kiosk_ids', [kioskId]);

      // Filter campaigns based on actual dates and status
      const activeCampaignIds: string[] = [];
      const expiredCampaignIds: string[] = [];

      for (const campaign of allCampaigns || []) {
        const startDate = new Date(campaign.start_date);
        const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
        
        // Campaign should be active if:
        // 1. Status is 'active', 'pending', or 'approved' AND
        // 2. Start date has passed AND
        // 3. End date hasn't passed (or no end date)
        if (['active', 'pending', 'approved'].includes(campaign.status) && 
            startDate <= now && 
            (!endDate || endDate >= now)) {
          activeCampaignIds.push(campaign.id);
        }
        
        // Campaign should be archived if:
        // 1. Status is 'completed' or 'paused' OR
        // 2. End date has passed
        if (['completed', 'paused'].includes(campaign.status) || 
            (endDate && endDate < now)) {
          expiredCampaignIds.push(campaign.id);
        }
      }

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
          // Move file from scheduled to active folder (or from archive if scheduled folder doesn't exist)
          const sourceFolderId = folderMapping.scheduled_folder_id || folderMapping.archive_folder_id;
          await this.moveFileInGoogleDrive(
            asset.id,
            sourceFolderId,
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

  // Move file between Google Drive folders using real API
  private static async moveFileInGoogleDrive(
    assetId: string,
    fromFolderId: string,
    toFolderId: string,
    config: GoogleDriveConfig
  ): Promise<void> {
    try {
      console.log(`Moving asset ${assetId} from folder ${fromFolderId} to ${toFolderId}`);
      
      // Find the Google Drive file ID from the upload_jobs table
      const { data: uploadJob, error: uploadJobError } = await supabase
        .from('upload_jobs')
        .select('gdrive_file_id')
        .eq('media_asset_id', assetId)
        .eq('status', 'completed')
        .not('gdrive_file_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (uploadJobError) {
        console.error(`Error fetching upload job for asset ${assetId}:`, uploadJobError);
        return;
      }

      if (!uploadJob?.gdrive_file_id) {
        console.warn(`No Google Drive file ID found for asset ${assetId}, skipping move operation`);
        return;
      }

      // Move the file using real Google Drive API
      await GoogleDriveApiService.moveFile(
        config,
        uploadJob.gdrive_file_id,
        fromFolderId,
        toFolderId
      );
      
      console.log(`Successfully moved asset ${assetId} to folder ${toFolderId}`);
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
          kiosks!kiosk_id(name, location),
          google_drive_configs!gdrive_config_id(name)
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
            folder_type: 'scheduled'
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

  // Fallback: Directly upload approved campaign assets to Drive for provided kiosks
  static async directUploadCampaignAssets(campaignId: string, kioskIds: string[]): Promise<void> {
    try {
      const gdriveConfig = await this.getGoogleDriveConfig();
      if (!gdriveConfig) throw new Error('No active Google Drive configuration found');

      // Get approved assets with metadata (publicUrl)
      const { data: assets, error: assetsErr } = await supabase
        .from('media_assets')
        .select('file_name, file_path, metadata')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');

      if (assetsErr) throw assetsErr;
      if (!assets || assets.length === 0) return;

      for (const kioskId of kioskIds) {
        const { data: folderMapping } = await supabase
          .from('kiosk_gdrive_folders')
          .select('*')
          .eq('kiosk_id', kioskId)
          .eq('gdrive_config_id', gdriveConfig.id)
          .maybeSingle();

        if (!folderMapping) continue;

        for (const asset of assets) {
          const existingPublicUrl = (asset as any)?.metadata?.publicUrl as string | undefined;
          let fileUrl = existingPublicUrl;
          if (!fileUrl) {
            const { data: urlData } = supabase.storage
              .from('media-assets')
              .getPublicUrl(asset.file_path);
            fileUrl = urlData?.publicUrl;
          }
          if (!fileUrl) continue;
          const pseudo = { file_name: asset.file_name, file_url: fileUrl } as any;
          try {
            // Upload to scheduled folder during approval, will be moved to active when campaign starts
            const targetFolderId = folderMapping.scheduled_folder_id || folderMapping.active_folder_id;
            await this.uploadFileToGoogleDrive(pseudo, targetFolderId, gdriveConfig);
          } catch (e) {
            console.error('Direct upload failed for asset', asset.file_name, 'kiosk', kioskId, e);
          }
        }
      }
    } catch (error) {
      console.error('Error in directUploadCampaignAssets:', error);
    }
  }

  // Upload approved host ad media to all currently active kiosk assignments
  static async uploadApprovedHostAdToAssignedKiosks(hostAdId: string): Promise<void> {
    try {
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] start', { hostAdId });
      // Fetch host ad
      const { data: hostAd, error: hostAdErr } = await supabase
        .from('host_ads')
        .select('id, name, media_url, media_type, duration')
        .eq('id', hostAdId)
        .single();

      if (hostAdErr || !hostAd) {
        throw new Error('Host ad not found');
      }

      // Find active assignments (now within start/end)
      const nowIso = new Date().toISOString();
      const { data: assignments, error: assignErr } = await supabase
        .from('host_ad_assignments')
        .select('kiosk_id')
        .eq('ad_id', hostAdId)
        .lte('start_date', nowIso)
        .gte('end_date', nowIso);

      if (assignErr) throw assignErr;
      const kioskIds: string[] = (assignments || []).map(a => a.kiosk_id);
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] active kioskIds', kioskIds);
      if (kioskIds.length === 0) {
        // Nothing to upload if no current assignments
        console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] no active assignments, exit');
        return;
      }

      // Active Google Drive configuration
      const gdriveConfig = await this.getGoogleDriveConfig();
      if (!gdriveConfig) {
        throw new Error('No active Google Drive configuration found');
      }
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] using gdrive config', gdriveConfig.id);

      // Prepare pseudo media asset for upload using URL
      // Derive a file name from ad name or URL
      const url = hostAd.media_url as string;
      const urlTail = url.split('?')[0].split('/').pop() || 'asset';
      const extension = urlTail.includes('.') ? urlTail.split('.').pop() : (hostAd.media_type === 'video' ? 'mp4' : 'png');
      const safeBase = (hostAd.name || 'host-ad').replace(/[^a-z0-9-_]+/gi, '_');
      const fileName = `${safeBase}.${extension}`;

      // No direct upload object here; we'll create a media asset and enqueue jobs

      // Instead of uploading directly, create a synthetic media_assets row and enqueue upload_jobs per kiosk
      // Build file_path to be either the storage object path or a full URL
      let filePath: string = url;
      const marker = '/storage/v1/object/public/media-assets/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        filePath = url.substring(idx + marker.length);
      }

      // Infer mime type from extension
      const ext = (extension || '').toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        mp4: 'video/mp4',
        avi: 'video/avi',
        mov: 'video/quicktime'
      };
      const mimeType = mimeMap[ext] || (hostAd.media_type === 'video' ? 'video/mp4' : 'image/png');

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Create synthetic media asset (approved)
      const { data: mediaAsset, error: insertErr } = await supabase
        .from('media_assets')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_path: filePath,
          file_size: 0,
          file_type: hostAd.media_type === 'video' ? 'video' : 'image',
          mime_type: mimeType,
          dimensions: { width: 0, height: 0 },
          duration: hostAd.duration || null,
          status: 'approved',
          metadata: { source: 'host_ad', host_ad_id: hostAdId }
        })
        .select('*')
        .single();

      if (insertErr || !mediaAsset) {
        console.error('Media asset creation error:', insertErr);
        throw new Error(`Failed to create media asset for host ad upload: ${insertErr?.message || 'Unknown error'}`);
      }
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] created synthetic media asset', mediaAsset.id);

      // Ensure kiosk folders exist before scheduling uploads (mirrors admin approval flow)
      try {
        await this.ensureScheduledFoldersForKiosks(kioskIds);
      } catch (folderErr) {
        console.warn('Unable to ensure scheduled folders for kiosks; proceeding anyway:', folderErr);
      }

      // Enqueue upload jobs per kiosk
      for (const kioskId of kioskIds) {
        const jobId = await this.scheduleUpload({
          gdrive_config_id: gdriveConfig.id,
          kiosk_id: kioskId,
          campaign_id: mediaAsset.campaign_id || '00000000-0000-0000-0000-000000000000',
          media_asset_id: mediaAsset.id,
          scheduled_time: new Date().toISOString(),
          upload_type: 'immediate',
          folder_type: 'active'
        });
        console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] scheduled upload job', { kioskId, jobId });
      }

      // Trigger processor
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] invoking gdrive-upload-processor');
      await this.triggerUploadProcessor();
      console.log('[GoogleDriveService.uploadApprovedHostAdToAssignedKiosks] edge function invoked');
    } catch (error) {
      console.error('Error uploading approved host ad to assigned kiosks:', error);
      // Log the specific error for debugging
      if (error instanceof Error) {
        console.error('Specific error details:', error.message);
      }
      // Let caller decide whether to ignore; do not throw to avoid blocking approvals typically
    }
  }

  // Get folder structure status
  static async getFolderStructureStatus(): Promise<FolderStructure[]> {
    try {
      const { data: folders, error } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosks!kiosk_id(name, location),
          google_drive_configs!gdrive_config_id(name, is_active)
        `)
        .eq('google_drive_configs.is_active', true);

      if (error) throw error;

      return (folders || []).map(folder => ({
        id: folder.id,
        kioskId: folder.kiosk_id,
        kioskName: folder.kiosks?.name || 'Unknown',
        activeFolderId: folder.active_folder_id,
        archiveFolderId: folder.archive_folder_id,
        scheduledFolderId: folder.scheduled_folder_id,
        status: 'ready' as const,
        folderPath: `EZ Kiosk Ads > Kiosks > ${folder.kiosks?.name || 'Unknown'} > [Scheduled/Active/Archive]`
      }));
    } catch (error) {
      console.error('Error fetching folder structure status:', error);
      return [];
    }
  }

  // Invoke the Edge Function that processes pending upload_jobs immediately
  static async triggerUploadProcessor(): Promise<void> {
    try {
      await supabase.functions.invoke('gdrive-upload-processor', {
        method: 'POST',
        body: { trigger: 'manual' }
      });
    } catch (error) {
      console.error('Error invoking gdrive-upload-processor:', error);
      throw error;
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
      
      // Get the Google Drive configuration
      const config = await this.getGoogleDriveConfig();
      if (!config) {
        throw new Error('No active Google Drive configuration found');
      }

      // Get the kiosk folder mapping for this asset
      const { data: asset } = await supabase
        .from('media_assets')
        .select(`
          campaign_id,
          campaigns!inner(selected_kiosk_ids)
        `)
        .eq('id', assetId)
        .single();

      if (!asset?.campaigns || !Array.isArray(asset.campaigns)) {
        throw new Error('Asset campaign or kiosk information not found');
      }

      // Get the first campaign's selected kiosk IDs
      const campaign = asset.campaigns[0];
      if (!campaign?.selected_kiosk_ids) {
        throw new Error('Campaign kiosk information not found');
      }

      // For each kiosk, move the file from archive to active folder
      for (const kioskId of campaign.selected_kiosk_ids) {
        const { data: folderMapping } = await supabase
          .from('kiosk_gdrive_folders')
          .select('*')
          .eq('kiosk_id', kioskId)
          .eq('gdrive_config_id', config.id)
          .single();

        if (folderMapping) {
          await GoogleDriveApiService.moveFile(
            config,
            driveFileId,
            folderMapping.archive_folder_id,
            folderMapping.active_folder_id
          );
        }
      }
      
      console.log(`Asset ${assetId} restored successfully`);
    } catch (error) {
      console.error('Error restoring asset:', error);
      throw error;
    }
  }

  // Sync all folders for all kiosks (immediate - bypasses queue)
  static async syncAllFoldersImmediate(): Promise<{
    success: boolean;
    message: string;
    foldersSynced: number;
    errors: string[];
  }> {
    try {
      console.log('Starting immediate sync all folders process...');
      
      // First, ensure scheduled folders exist
      await this.ensureScheduledFoldersExist();
      
      // Get all kiosks with their Google Drive folder mappings
      const { data: kioskFolders, error: foldersError } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosks!kiosk_id(name, location),
          google_drive_configs!gdrive_config_id(name, is_active)
        `)
        .eq('google_drive_configs.is_active', true);

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
          console.log(`Immediate syncing folders for kiosk: ${folderMapping.kiosks?.name || 'Unknown'}`);
          
          // Get active Google Drive config
          const gdriveConfig = await this.getGoogleDriveConfig(folderMapping.gdrive_config_id);
          if (!gdriveConfig) {
            throw new Error('No active Google Drive configuration found');
          }

          // Sync files for this kiosk immediately
          const syncResult = await this.syncKioskFiles(
            folderMapping.kiosk_id,
            folderMapping,
            gdriveConfig
          );

          foldersSynced++;
          console.log(`Successfully synced kiosk ${folderMapping.kiosks?.name || 'Unknown'}: ${syncResult.filesSynced} files synced`);
        } catch (error) {
          const errorMessage = `Failed to sync kiosk ${folderMapping.kiosks?.name || 'Unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      const success = errors.length === 0;
      return {
        success,
        message: success 
          ? `Successfully synced ${foldersSynced} folders` 
          : `Synced ${foldersSynced} folders with ${errors.length} errors`,
        foldersSynced,
        errors
      };
    } catch (error) {
      console.error('Error in immediate sync all folders:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        foldersSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
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
      
      // First, ensure scheduled folders exist
      await this.ensureScheduledFoldersExist();
      
      // Get all kiosks with their Google Drive folder mappings
      const { data: kioskFolders, error: foldersError } = await supabase
        .from('kiosk_gdrive_folders')
        .select(`
          *,
          kiosks!kiosk_id(name, location),
          google_drive_configs!gdrive_config_id(name, is_active)
        `)
        .eq('google_drive_configs.is_active', true);

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
          console.log(`Syncing folders for kiosk: ${folderMapping.kiosks?.name || 'Unknown'}`);
          
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
            console.log(`Successfully synced folders for kiosk: ${folderMapping.kiosks?.name || 'Unknown'}`);
          }
        } catch (error) {
          const errorMessage = `Failed to sync kiosk ${folderMapping.kiosks?.name || 'Unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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

  // Ensure the main "EZ Kiosk Ads" folder exists
  private static async ensureMainFolderExists(config: GoogleDriveConfig): Promise<{ id: string; name: string }> {
    try {
      // List root children and find exact folder name match
      const rootChildren = await GoogleDriveApiService.listFiles(config, 'root', 200);
      const mainFolder = rootChildren.find(folder =>
        folder.name === 'EZ Kiosk Ads' &&
        folder.mimeType === 'application/vnd.google-apps.folder'
      );

      if (mainFolder) {
        return { id: mainFolder.id, name: mainFolder.name };
      }

      // Create the main folder in root if it doesn't exist
      const newMainFolder = await GoogleDriveApiService.createFolder(
        config,
        'EZ Kiosk Ads',
        undefined // Create in root
      );

      return { id: newMainFolder.id, name: newMainFolder.name };
    } catch (error) {
      console.error('Error ensuring main folder exists:', error);
      throw error;
    }
  }

  // Ensure the "Kiosks" subfolder exists inside the main folder
  private static async ensureKiosksFolderExists(config: GoogleDriveConfig, mainFolderId: string): Promise<{ id: string; name: string }> {
    try {
      // List children of main folder and find exact folder name match
      const mainChildren = await GoogleDriveApiService.listFiles(config, mainFolderId, 200);
      const kiosksFolder = mainChildren.find(folder =>
        folder.name === 'Kiosks' &&
        folder.mimeType === 'application/vnd.google-apps.folder'
      );

      if (kiosksFolder) {
        return { id: kiosksFolder.id, name: kiosksFolder.name };
      }

      // Create the Kiosks folder if it doesn't exist
      const newKiosksFolder = await GoogleDriveApiService.createFolder(
        config,
        'Kiosks',
        mainFolderId
      );

      return { id: newKiosksFolder.id, name: newKiosksFolder.name };
    } catch (error) {
      console.error('Error ensuring kiosks folder exists:', error);
      throw error;
    }
  }

  // Ensure a direct child folder with exact name exists under parent
  private static async ensureChildFolderExists(
    config: GoogleDriveConfig,
    parentFolderId: string,
    childName: string
  ): Promise<{ id: string; name: string }> {
    // List children of the parent and find exact-name folder match
    const children = await GoogleDriveApiService.listFiles(config, parentFolderId, 200);
    const match = children.find(f => f.name === childName && f.mimeType === 'application/vnd.google-apps.folder');
    if (match) {
      return { id: match.id, name: match.name };
    }
    const created = await GoogleDriveApiService.createFolder(config, childName, parentFolderId);
    return { id: created.id, name: created.name };
  }

  // Get daily upload time for active configuration
  static async getDailyUploadTime(): Promise<string | null> {
    try {
      const config = await this.getGoogleDriveConfig() as ExtendedGoogleDriveConfig;
      return config?.daily_upload_time || null;
    } catch (error) {
      console.error('Error getting daily upload time:', error);
      return null;
    }
  }

  // Schedule daily uploads based on configured time
  static async scheduleDailyUploads(): Promise<void> {
    try {
      const config = await this.getGoogleDriveConfig() as ExtendedGoogleDriveConfig;
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
              folder_type: 'scheduled'
            });
          }
        }
      }

      console.log(`Scheduled daily uploads for ${nextUpload.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling daily uploads:', error);
    }
  }

  // Delete a folder from Google Drive
  static async deleteFolder(config: GoogleDriveConfig, folderId: string): Promise<void> {
    try {
      await GoogleDriveApiService.deleteFile(config, folderId);
    } catch (error) {
      console.error('Error deleting folder from Google Drive:', error);
      throw error;
    }
  }

  // Delete kiosk folders from Google Drive
  static async deleteKioskFolders(config: GoogleDriveConfig, folderIds: string[]): Promise<void> {
    try {
      const deletePromises = folderIds.map(folderId => 
        this.deleteFolder(config, folderId).catch(error => {
          // If folder is already deleted (404), treat as success
          if (error instanceof Error && error.message && error.message.includes('File not found')) {
            console.log(`Folder ${folderId} already deleted (404), treating as success`);
            return; // Success - folder already deleted
          }
          console.warn(`Failed to delete folder ${folderId}:`, error);
          // Don't throw here to allow other folders to be deleted
        })
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting kiosk folders:', error);
      throw error;
    }
  }

  // Delete the main kiosk folder (and all its contents) from Google Drive
  static async deleteKioskMainFolder(config: GoogleDriveConfig, kioskName: string, folderIds: string[]): Promise<void> {
    try {
      console.log(`Attempting to delete main folder for kiosk: ${kioskName}`);
      
      // Use the existing folder IDs to find the parent folder
      // This is more reliable than searching by name
      const { GoogleDriveApiServiceBrowser } = await import('./googleDriveApiServiceBrowser');
      
      let mainKioskFolderId: string | null = null;
      
      // Try to get the parent folder ID from any of the subfolders
      for (const folderId of folderIds) {
        if (!folderId) continue;
        
        try {
          console.log(`Getting folder info for ${folderId} to find parent`);
          const folderInfo = await GoogleDriveApiServiceBrowser.getFile(config, folderId);
          
          if (folderInfo.parents && folderInfo.parents.length > 0) {
            const parentId = folderInfo.parents[0];
            console.log(`Found parent folder ID: ${parentId} for subfolder: ${folderId}`);
            
            // Verify this is actually the kiosk folder by checking its name
            try {
              const parentInfo = await GoogleDriveApiServiceBrowser.getFile(config, parentId);
              console.log(`Parent folder name: "${parentInfo.name}"`);
              
              if (parentInfo.name === kioskName) {
                mainKioskFolderId = parentId;
                console.log(`Confirmed main kiosk folder: ${kioskName} (ID: ${parentId})`);
                break;
              }
            } catch (parentError) {
              console.warn(`Failed to get parent folder info for ${parentId}:`, parentError);
            }
          }
        } catch (error) {
          console.warn(`Failed to get folder info for ${folderId}:`, error);
          continue;
        }
      }
      
      if (mainKioskFolderId) {
        // Delete the main kiosk folder (this will delete all its contents including subfolders)
        await this.deleteFolder(config, mainKioskFolderId);
        console.log(`Successfully deleted main kiosk folder: ${kioskName} (ID: ${mainKioskFolderId})`);
        return;
      } else {
        console.warn(`Could not find main kiosk folder for "${kioskName}", falling back to individual folder deletion`);
        await this.deleteKioskFolders(config, folderIds);
        return;
      }
      
    } catch (error) {
      console.error('Error deleting main kiosk folder:', error);
      // Only fall back to individual deletion if the main folder deletion actually failed
      // (not if it succeeded but we got an error trying to delete already-deleted subfolders)
      if (error instanceof Error && error.message && error.message.includes('File not found')) {
        console.log('Main folder deletion succeeded (subfolders already deleted), no fallback needed');
        return;
      }
      
      try {
        console.log('Falling back to deleting individual folders');
        await this.deleteKioskFolders(config, folderIds);
        console.log('Successfully deleted individual folders as fallback');
      } catch (fallbackError) {
        console.error('Fallback deletion also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  // Helper method to find a folder by name within a parent folder
  private static async findFolderByName(config: GoogleDriveConfig, folderName: string, parentId?: string): Promise<{ id: string; name: string } | null> {
    try {
      const { GoogleDriveApiServiceBrowser } = await import('./googleDriveApiServiceBrowser');
      
      console.log(`Searching for folder "${folderName}"${parentId ? ` in parent ${parentId}` : ''}`);
      
      let files;
      if (parentId) {
        // List files in the parent folder and filter by name
        files = await GoogleDriveApiServiceBrowser.listFiles(config, parentId, 200);
        console.log(`Found ${files.length} files in parent folder ${parentId}`);
      } else {
        // Search in root folder
        const query = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
        files = await GoogleDriveApiServiceBrowser.searchFiles(config, query);
        console.log(`Found ${files.length} folders in root`);
      }
      
      const folder = files.find((f: { name: string; mimeType: string; id: string }) => 
        f.name === folderName && f.mimeType === 'application/vnd.google-apps.folder'
      );
      
      if (folder) {
        console.log(`Found folder "${folderName}" with ID: ${folder.id}`);
      } else {
        console.log(`Folder "${folderName}" not found`);
      }
      
      return folder ? { id: folder.id, name: folder.name } : null;
    } catch (error) {
      console.error(`Error finding folder "${folderName}":`, error);
      return null;
    }
  }
}
