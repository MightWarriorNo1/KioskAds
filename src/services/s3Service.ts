import { supabase } from '../lib/supabaseClient';
import { S3Configuration, OptiSignsImportJob, OptiSignsProofOfPlay } from '../types/database';
import { AWSS3Service, S3Config as AWSS3Config } from './awsS3Service';

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface OptiSignsCSVRow {
  kiosk_id: string;
  campaign_id: string;
  media_id: string;
  play_date: string;
  play_duration: number;
  play_count: number;
  device_id?: string;
  location?: string;
  [key: string]: any; // for additional fields
}

export class S3Service {
  // Get S3 configuration
  static async getS3Configuration(configId?: string): Promise<S3Configuration | null> {
    try {
      let query = supabase
        .from('s3_configurations')
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
      console.error('Error fetching S3 configuration:', error);
      return null;
    }
  }

  // Create or update S3 configuration
  static async saveS3Configuration(config: {
    name: string;
    bucket_name: string;
    region: string;
    access_key_id: string;
    secret_access_key: string;
    is_active?: boolean;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('s3_configurations')
        .upsert(config, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving S3 configuration:', error);
      return null;
    }
  }

  // List files in S3 bucket using real AWS SDK
  static async listOptiSignsFiles(config: S3Config, prefix?: string): Promise<string[]> {
    try {
      const envPrefix = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_AWS_S3_PREFIX : undefined) || (globalThis as any).VITE_AWS_S3_PREFIX || '';
      const effectivePrefix = prefix ?? envPrefix ?? '';
      console.log('Listing files from S3 bucket:', config.bucketName, 'with prefix:', effectivePrefix);
      
      const awsConfig: AWSS3Config = {
        bucketName: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      };

      const objects = await AWSS3Service.listObjects(awsConfig, effectivePrefix);
      return objects.map(obj => obj.key);
    } catch (error) {
      console.error('Error listing S3 files:', error);
      return [];
    }
  }

  // Download and parse CSV file from S3 using real AWS SDK
  static async downloadAndParseCSV(config: S3Config, filePath: string): Promise<OptiSignsCSVRow[]> {
    try {
      console.log('Downloading CSV from S3:', filePath);
      
      const awsConfig: AWSS3Config = {
        bucketName: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      };

      // Download the CSV file content
      const csvContent = await AWSS3Service.getObjectAsText(awsConfig, filePath);
      
      // Parse CSV content
      const csvRows = AWSS3Service.parseCSV(csvContent);
      
      // Convert to OptiSignsCSVRow format
      const optiSignsData: OptiSignsCSVRow[] = csvRows.map(row => ({
        kiosk_id: row.kiosk_id || '',
        campaign_id: row.campaign_id || '',
        media_id: row.media_id || '',
        play_date: row.play_date || '',
        play_duration: parseInt(row.play_duration) || 0,
        play_count: parseInt(row.play_count) || 0,
        device_id: row.device_id,
        location: row.location,
        ...row // Include any additional fields
      }));

      return optiSignsData;
    } catch (error) {
      console.error('Error downloading and parsing CSV:', error);
      return [];
    }
  }

  // Create import job
  static async createImportJob(data: {
    s3_config_id: string;
    file_path: string;
    file_size?: number;
  }): Promise<string | null> {
    try {
      const { data: job, error } = await supabase
        .from('optisigns_import_jobs')
        .insert({
          ...data,
          status: 'pending',
          records_processed: 0,
          records_total: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      return job.id;
    } catch (error) {
      console.error('Error creating import job:', error);
      return null;
    }
  }

  // Update import job status
  static async updateImportJobStatus(
    jobId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    updates?: {
      records_processed?: number;
      records_total?: number;
      error_message?: string;
      started_at?: string;
      completed_at?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('optisigns_import_jobs')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating import job status:', error);
      return false;
    }
  }

  // Save proof of play data
  static async saveProofOfPlayData(
    importJobId: string,
    data: OptiSignsCSVRow[]
  ): Promise<boolean> {
    try {
      const proofOfPlayData = data.map(row => ({
        import_job_id: importJobId,
        kiosk_id: row.kiosk_id,
        campaign_id: row.campaign_id,
        media_id: row.media_id,
        play_date: row.play_date,
        play_duration: row.play_duration,
        play_count: row.play_count,
        device_id: row.device_id,
        location: row.location,
        raw_data: row
      }));

      const { error } = await supabase
        .from('optisigns_proof_of_play')
        .insert(proofOfPlayData);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving proof of play data:', error);
      return false;
    }
  }

  // Get import jobs
  static async getImportJobs(): Promise<OptiSignsImportJob[]> {
    try {
      const { data, error } = await supabase
        .from('optisigns_import_jobs')
        .select(`
          *,
          s3_config:s3_configurations(name, bucket_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching import jobs:', error);
      return [];
    }
  }

  // Get proof of play data for a campaign
  static async getProofOfPlayData(campaignId: string): Promise<OptiSignsProofOfPlay[]> {
    try {
      const { data, error } = await supabase
        .from('optisigns_proof_of_play')
        .select(`
          *,
          kiosk:kiosks(name, location),
          campaign:campaigns(name),
          media:media_assets(file_name)
        `)
        .eq('campaign_id', campaignId)
        .order('play_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching proof of play data:', error);
      return [];
    }
  }

  // Test S3 connection using real AWS SDK
  static async testS3Connection(config: S3Config): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const awsConfig: AWSS3Config = {
        bucketName: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      };
      const envPrefix = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_AWS_S3_PREFIX : undefined) || (globalThis as any).VITE_AWS_S3_PREFIX || '';
      return await AWSS3Service.testConnection(awsConfig, { prefix: envPrefix });
    } catch (error) {
      return {
        success: false,
        message: `S3 connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          bucket: config.bucketName,
          region: config.region,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Process daily import (to be called by a scheduled job)
  static async processDailyImport(): Promise<void> {
    try {
      const config = await this.getS3Configuration();
      if (!config) {
        console.error('No active S3 configuration found');
        return;
      }

      const s3Config: S3Config = {
        bucketName: config.bucket_name,
        region: config.region,
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key
      };

      // Get today's date for file naming
      const today = new Date().toISOString().split('T')[0];
      const filePrefix = `optisigns/proof-of-play-${today}`;

      // List files for today
      const files = await this.listOptiSignsFiles(s3Config, filePrefix);
      
      for (const filePath of files) {
        // Check if this file has already been processed
        const { data: existingJob } = await supabase
          .from('optisigns_import_jobs')
          .select('id')
          .eq('file_path', filePath)
          .single();

        if (existingJob) {
          console.log('File already processed:', filePath);
          continue;
        }

        // Create import job
        const jobId = await this.createImportJob({
          s3_config_id: config.id,
          file_path: filePath
        });

        if (!jobId) {
          console.error('Failed to create import job for:', filePath);
          continue;
        }

        // Update status to processing
        await this.updateImportJobStatus(jobId, 'processing', {
          started_at: new Date().toISOString()
        });

        try {
          // Download and parse CSV
          const csvData = await this.downloadAndParseCSV(s3Config, filePath);
          
          if (csvData.length === 0) {
            await this.updateImportJobStatus(jobId, 'completed', {
              records_processed: 0,
              records_total: 0,
              completed_at: new Date().toISOString()
            });
            continue;
          }

          // Save proof of play data
          const success = await this.saveProofOfPlayData(jobId, csvData);
          
          if (success) {
            await this.updateImportJobStatus(jobId, 'completed', {
              records_processed: csvData.length,
              records_total: csvData.length,
              completed_at: new Date().toISOString()
            });
            console.log(`Successfully processed ${csvData.length} records from ${filePath}`);
          } else {
            await this.updateImportJobStatus(jobId, 'failed', {
              error_message: 'Failed to save proof of play data',
              completed_at: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing file:', filePath, error);
          await this.updateImportJobStatus(jobId, 'failed', {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error in daily import process:', error);
    }
  }
}
