import { supabase } from '../lib/supabaseClient';

export interface AssetFolderSchedulerInfo {
  scheduler_enabled: boolean;
  scheduler_time: string;
  scheduler_timezone: string;
  cron_job_active: boolean;
  last_run_time: string | null;
  next_run_time: string | null;
}

export interface CronJobStatus {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
}

export class AssetFolderSchedulerService {
  /**
   * Get the current status and configuration of the asset folder scheduler
   */
  static async getSchedulerInfo(): Promise<AssetFolderSchedulerInfo> {
    try {
      const { data, error } = await supabase.rpc('get_asset_folder_scheduler_info');
      
      if (error) {
        throw new Error(`Failed to get scheduler info: ${error.message}`);
      }
      
      return data as AssetFolderSchedulerInfo;
    } catch (error) {
      console.error('Error getting asset folder scheduler info:', error);
      throw error;
    }
  }

  /**
   * Get the detailed cron job status
   */
  static async getCronJobStatus(): Promise<CronJobStatus[]> {
    try {
      const { data, error } = await supabase.rpc('check_asset_folder_scheduler_status');
      
      if (error) {
        throw new Error(`Failed to get cron job status: ${error.message}`);
      }
      
      return data as CronJobStatus[];
    } catch (error) {
      console.error('Error getting cron job status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger the asset folder scheduler
   */
  static async triggerScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('trigger_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to trigger scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error triggering asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the asset folder scheduler cron job
   */
  static async stopScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('stop_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to stop scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error stopping asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Restart the asset folder scheduler cron job
   */
  static async restartScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to restart scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error restarting asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Update the scheduler time
   */
  static async updateSchedulerTime(newTime: string): Promise<string> {
    try {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newTime)) {
        throw new Error('Invalid time format. Please use HH:MM format (24-hour).');
      }

      const { data, error } = await supabase.rpc('update_asset_folder_scheduler_time', {
        new_time: newTime
      });
      
      if (error) {
        throw new Error(`Failed to update scheduler time: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error updating asset folder scheduler time:', error);
      throw error;
    }
  }

  /**
   * Enable or disable the asset folder scheduler
   */
  static async setSchedulerEnabled(enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: enabled })
        .eq('key', 'asset_folder_scheduler_enabled');
      
      if (error) {
        throw new Error(`Failed to update scheduler enabled status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting scheduler enabled status:', error);
      throw error;
    }
  }

  /**
   * Get system settings related to asset folder scheduler
   */
  static async getSchedulerSettings(): Promise<Record<string, { value: unknown; description: string }>> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .in('key', [
          'asset_folder_scheduler_enabled',
          'asset_folder_scheduler_time',
          'asset_folder_scheduler_timezone'
        ]);
      
      if (error) {
        throw new Error(`Failed to get scheduler settings: ${error.message}`);
      }
      
      const settings: Record<string, { value: unknown; description: string }> = {};
      data?.forEach(setting => {
        // Handle JSONB values - they might be objects or primitives
        let parsedValue = setting.value;
        if (typeof setting.value === 'object' && setting.value !== null) {
          // If it's already an object, use it as is
          parsedValue = setting.value;
        } else if (typeof setting.value === 'string') {
          // Try to parse JSON strings
          try {
            parsedValue = JSON.parse(setting.value);
          } catch {
            // If parsing fails, use the raw string value
            parsedValue = setting.value;
          }
        }
        
        settings[setting.key] = {
          value: parsedValue,
          description: setting.description
        };
      });
      
      return settings;
    } catch (error) {
      console.error('Error getting scheduler settings:', error);
      throw error;
    }
  }

  /**
   * Test the asset folder scheduler by calling the edge function directly
   */
  static async testScheduler(): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase.functions.invoke('asset-folder-scheduler', {
        body: {}
      });
      
      if (error) {
        throw new Error(`Failed to test scheduler: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error testing asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Test the asset folder scheduler with detailed output
   */
  static async testSchedulerDetailed(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('test_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to test scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error testing asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Get recent activity logs for the asset folder scheduler
   */
  static async getRecentActivity(limit: number = 10): Promise<Record<string, unknown>[]> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('resource_type', 'cron_job')
        .or('details->>job_name.eq.asset-folder-scheduler,action.eq.CREATE')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to get recent activity: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }
}
