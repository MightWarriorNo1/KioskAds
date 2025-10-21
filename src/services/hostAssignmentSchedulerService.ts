import { supabase } from '../lib/supabaseClient';

export interface SchedulerInfo {
  scheduler_enabled: boolean;
  scheduler_time: string;
  scheduler_timezone: string;
  asset_folder_cron_active: boolean;
  host_assignment_cron_active: boolean;
  last_asset_run_time: string | null;
  last_host_run_time: string | null;
  next_run_time: string | null;
}

export class HostAssignmentSchedulerService {
  /**
   * Get the current status and configuration of the host assignment scheduler
   */
  static async getSchedulerInfo(): Promise<SchedulerInfo> {
    try {
      const { data, error } = await supabase.rpc('get_scheduler_info_with_host_assignments');
      
      if (error) {
        throw new Error(`Failed to get scheduler info: ${error.message}`);
      }
      
      return data?.[0] || {
        scheduler_enabled: false,
        scheduler_time: '00:00',
        scheduler_timezone: 'America/Los_Angeles',
        asset_folder_cron_active: false,
        host_assignment_cron_active: false,
        last_asset_run_time: null,
        last_host_run_time: null,
        next_run_time: null
      };
    } catch (error) {
      console.error('Error getting scheduler info:', error);
      throw error;
    }
  }

  /**
   * Update the scheduler time and restart the cron jobs
   */
  static async updateSchedulerTime(newTime: string): Promise<string> {
    try {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newTime)) {
        throw new Error('Invalid time format. Please use HH:MM format (e.g., "14:30")');
      }

      const { data, error } = await supabase.rpc('update_scheduler_time', {
        new_time: newTime
      });
      
      if (error) {
        throw new Error(`Failed to update scheduler time: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error updating scheduler time:', error);
      throw error;
    }
  }

  /**
   * Enable or disable the scheduler
   */
  static async setSchedulerEnabled(enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: enabled })
        .eq('key', 'host_assignment_scheduler_enabled');

      if (error) {
        throw new Error(`Failed to update scheduler enabled status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting scheduler enabled:', error);
      throw error;
    }
  }

  /**
   * Manually trigger the host assignment processor
   */
  static async triggerHostAssignmentProcessor(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('call_host_assignment_processor');
      
      if (error) {
        throw new Error(`Failed to trigger host assignment processor: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error triggering host assignment processor:', error);
      throw error;
    }
  }

  /**
   * Restart all schedulers (both asset folder and host assignment)
   */
  static async restartAllSchedulers(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('restart_schedulers_with_current_time');
      
      if (error) {
        throw new Error(`Failed to restart schedulers: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error restarting schedulers:', error);
      throw error;
    }
  }

  /**
   * Get system settings related to host assignment scheduler
   */
  static async getSchedulerSettings(): Promise<Record<string, { value: unknown; description: string }>> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .in('key', [
          'asset_folder_scheduler_enabled',
          'asset_folder_scheduler_time',
          'asset_folder_scheduler_timezone',
          'host_assignment_scheduler_enabled',
          'host_assignment_scheduler_time'
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
   * Test the host assignment processor by calling it directly
   */
  static async testHostAssignmentProcessor(): Promise<string> {
    try {
      console.log('[HostAssignmentSchedulerService] DEBUG: Testing host assignment processor');
      
      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('process-scheduled-assignments');
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      console.log('[HostAssignmentSchedulerService] DEBUG: Edge function response:', data);
      
      return `Test completed successfully. Response: ${JSON.stringify(data)}`;
    } catch (error) {
      console.error('Error testing host assignment processor:', error);
      throw error;
    }
  }
}
