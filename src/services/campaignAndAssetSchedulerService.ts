import { supabase } from '../lib/supabaseClient';

export interface SchedulerInfo {
  scheduler_type: string;
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

export class CampaignAndAssetSchedulerService {
  /**
   * Get the current status and configuration of both schedulers
   */
  static async getSchedulerInfo(): Promise<SchedulerInfo[]> {
    try {
      const { data, error } = await supabase.rpc('get_campaign_and_asset_scheduler_info');
      
      if (error) {
        throw new Error(`Failed to get scheduler info: ${error.message}`);
      }
      
      return data as SchedulerInfo[];
    } catch (error) {
      console.error('Error getting scheduler info:', error);
      throw error;
    }
  }

  /**
   * Get the detailed cron job status for campaign status scheduler
   */
  static async getCampaignStatusSchedulerStatus(): Promise<CronJobStatus[]> {
    try {
      const { data, error } = await supabase.rpc('check_campaign_status_scheduler_status');
      
      if (error) {
        throw new Error(`Failed to get campaign status scheduler status: ${error.message}`);
      }
      
      return data as CronJobStatus[];
    } catch (error) {
      console.error('Error getting campaign status scheduler status:', error);
      throw error;
    }
  }

  /**
   * Get the detailed cron job status for asset folder scheduler
   */
  static async getAssetFolderSchedulerStatus(): Promise<CronJobStatus[]> {
    try {
      const { data, error } = await supabase.rpc('check_asset_folder_scheduler_status');
      
      if (error) {
        throw new Error(`Failed to get asset folder scheduler status: ${error.message}`);
      }
      
      return data as CronJobStatus[];
    } catch (error) {
      console.error('Error getting asset folder scheduler status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger the campaign status scheduler
   */
  static async triggerCampaignStatusScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('trigger_campaign_status_scheduler');
      
      if (error) {
        throw new Error(`Failed to trigger campaign status scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error triggering campaign status scheduler:', error);
      throw error;
    }
  }

  /**
   * Manually trigger the asset folder scheduler
   */
  static async triggerAssetFolderScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('trigger_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to trigger asset folder scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error triggering asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Manually trigger both schedulers
   */
  static async triggerBothSchedulers(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('trigger_both_schedulers');
      
      if (error) {
        throw new Error(`Failed to trigger both schedulers: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error triggering both schedulers:', error);
      throw error;
    }
  }

  /**
   * Stop the campaign status scheduler cron job
   */
  static async stopCampaignStatusScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('stop_campaign_status_scheduler');
      
      if (error) {
        throw new Error(`Failed to stop campaign status scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error stopping campaign status scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the asset folder scheduler cron job
   */
  static async stopAssetFolderScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('stop_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to stop asset folder scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error stopping asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Restart the campaign status scheduler cron job
   */
  static async restartCampaignStatusScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_campaign_status_scheduler');
      
      if (error) {
        throw new Error(`Failed to restart campaign status scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error restarting campaign status scheduler:', error);
      throw error;
    }
  }

  /**
   * Restart the asset folder scheduler cron job
   */
  static async restartAssetFolderScheduler(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_asset_folder_scheduler');
      
      if (error) {
        throw new Error(`Failed to restart asset folder scheduler: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error restarting asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Restart both schedulers
   */
  static async restartBothSchedulers(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_both_schedulers');
      
      if (error) {
        throw new Error(`Failed to restart both schedulers: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error restarting both schedulers:', error);
      throw error;
    }
  }

  /**
   * Test both schedulers with detailed output
   */
  static async testBothSchedulers(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('test_both_schedulers');
      
      if (error) {
        throw new Error(`Failed to test both schedulers: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error testing both schedulers:', error);
      throw error;
    }
  }

  /**
   * Test the campaign status scheduler by calling the edge function directly
   */
  static async testCampaignStatusScheduler(): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign-status-scheduler', {
        body: {}
      });
      
      if (error) {
        throw new Error(`Failed to test campaign status scheduler: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error testing campaign status scheduler:', error);
      throw error;
    }
  }

  /**
   * Test the asset folder scheduler by calling the edge function directly
   */
  static async testAssetFolderScheduler(): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase.functions.invoke('asset-folder-scheduler', {
        body: {}
      });
      
      if (error) {
        throw new Error(`Failed to test asset folder scheduler: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error testing asset folder scheduler:', error);
      throw error;
    }
  }

  /**
   * Get system settings related to both schedulers
   */
  static async getSchedulerSettings(): Promise<Record<string, { value: unknown; description: string }>> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .in('key', [
          'campaign_status_scheduler_enabled',
          'campaign_status_scheduler_time',
          'campaign_status_scheduler_timezone',
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
   * Enable or disable the campaign status scheduler
   */
  static async setCampaignStatusSchedulerEnabled(enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: enabled })
        .eq('key', 'campaign_status_scheduler_enabled');
      
      if (error) {
        throw new Error(`Failed to update campaign status scheduler enabled status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting campaign status scheduler enabled status:', error);
      throw error;
    }
  }

  /**
   * Enable or disable the asset folder scheduler
   */
  static async setAssetFolderSchedulerEnabled(enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: enabled })
        .eq('key', 'asset_folder_scheduler_enabled');
      
      if (error) {
        throw new Error(`Failed to update asset folder scheduler enabled status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting asset folder scheduler enabled status:', error);
      throw error;
    }
  }

  /**
   * Update the campaign status scheduler time
   */
  static async updateCampaignStatusSchedulerTime(newTime: string): Promise<string> {
    try {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newTime)) {
        throw new Error('Invalid time format. Please use HH:MM format (24-hour).');
      }

      // Update the asset_folder_scheduler_time field as requested
      const { error } = await supabase
        .from('system_settings')
        .update({ value: `"${newTime}"` })
        .eq('key', 'asset_folder_scheduler_time');
      
      if (error) {
        throw new Error(`Failed to update campaign status scheduler time: ${error.message}`);
      }

      // Restart the unified schedulers with the new time
      const { data: restartResult, error: restartError } = await supabase.rpc('restart_unified_schedulers');
      
      if (restartError) {
        console.warn('Failed to restart unified schedulers:', restartError);
        return `Scheduler time updated to ${newTime} Los Angeles time, but failed to restart cron jobs. Please restart manually.`;
      }
      
      return `Scheduler time updated to ${newTime} Los Angeles time. ${restartResult}`;
    } catch (error) {
      console.error('Error updating campaign status scheduler time:', error);
      throw error;
    }
  }

  /**
   * Update the asset folder scheduler time (same as campaign status scheduler)
   */
  static async updateAssetFolderSchedulerTime(newTime: string): Promise<string> {
    try {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newTime)) {
        throw new Error('Invalid time format. Please use HH:MM format (24-hour).');
      }

      // Both schedulers use the same time setting
      const { error } = await supabase
        .from('system_settings')
        .update({ value: `"${newTime}"` })
        .eq('key', 'asset_folder_scheduler_time');
      
      if (error) {
        throw new Error(`Failed to update scheduler time: ${error.message}`);
      }

      // Restart the unified schedulers with the new time
      const { data: restartResult, error: restartError } = await supabase.rpc('restart_unified_schedulers');
      
      if (restartError) {
        console.warn('Failed to restart unified schedulers:', restartError);
        return `Scheduler time updated to ${newTime} Los Angeles time, but failed to restart cron jobs. Please restart manually.`;
      }
      
      return `Scheduler time updated to ${newTime} Los Angeles time. ${restartResult}`;
    } catch (error) {
      console.error('Error updating scheduler time:', error);
      throw error;
    }
  }

  /**
   * Get the current cron schedule for the unified schedulers
   */
  static async getSchedulerCronTime(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('get_scheduler_cron_schedule');
      
      if (error) {
        throw new Error(`Failed to get scheduler cron time: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error getting scheduler cron time:', error);
      throw error;
    }
  }

  /**
   * Restart the unified schedulers with the configured time
   */
  static async restartUnifiedSchedulers(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_unified_schedulers');
      
      if (error) {
        throw new Error(`Failed to restart unified schedulers: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error restarting unified schedulers:', error);
      throw error;
    }
  }

  /**
   * Get recent activity logs for both schedulers
   */
  static async getRecentActivity(limit: number = 10): Promise<Record<string, unknown>[]> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('resource_type', 'cron_job')
        .or('details->>job_name.eq.campaign-status-scheduler,details->>job_name.eq.asset-folder-scheduler,action.eq.CREATE')
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
