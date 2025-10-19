import { AssetFolderSchedulerService } from '../services/assetFolderSchedulerService';

/**
 * Test utility for the Asset Folder Scheduler
 * This can be used to test the scheduler functionality
 */
export class AssetFolderSchedulerTest {
  /**
   * Test the scheduler service connection
   */
  static async testConnection(): Promise<void> {
    try {
      console.log('Testing Asset Folder Scheduler connection...');
      
      const info = await AssetFolderSchedulerService.getSchedulerInfo();
      console.log('✅ Scheduler info retrieved successfully:', info);
      
      const status = await AssetFolderSchedulerService.getCronJobStatus();
      console.log('✅ Cron job status retrieved successfully:', status);
      
      console.log('✅ All connections successful');
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Test the scheduler trigger functionality
   */
  static async testTrigger(): Promise<void> {
    try {
      console.log('Testing Asset Folder Scheduler trigger...');
      
      const result = await AssetFolderSchedulerService.triggerScheduler();
      console.log('✅ Scheduler triggered successfully:', result);
      
    } catch (error) {
      console.error('❌ Trigger test failed:', error);
      throw error;
    }
  }

  /**
   * Test the scheduler edge function directly
   */
  static async testEdgeFunction(): Promise<void> {
    try {
      console.log('Testing Asset Folder Scheduler edge function...');
      
      const result = await AssetFolderSchedulerService.testScheduler();
      console.log('✅ Edge function test successful:', result);
      
    } catch (error) {
      console.error('❌ Edge function test failed:', error);
      throw error;
    }
  }

  /**
   * Test time update functionality
   */
  static async testTimeUpdate(): Promise<void> {
    try {
      console.log('Testing time update functionality...');
      
      // Test with a valid time
      const testTime = '01:00';
      const result = await AssetFolderSchedulerService.updateSchedulerTime(testTime);
      console.log('✅ Time update successful:', result);
      
      // Reset to original time
      await AssetFolderSchedulerService.updateSchedulerTime('00:00');
      console.log('✅ Time reset to original value');
      
    } catch (error) {
      console.error('❌ Time update test failed:', error);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Asset Folder Scheduler tests...\n');
    
    try {
      await this.testConnection();
      console.log('');
      
      await this.testEdgeFunction();
      console.log('');
      
      await this.testTrigger();
      console.log('');
      
      await this.testTimeUpdate();
      console.log('');
      
      console.log('🎉 All tests passed successfully!');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      throw error;
    }
  }

  /**
   * Get current scheduler status for debugging
   */
  static async getStatus(): Promise<void> {
    try {
      console.log('📊 Current Asset Folder Scheduler Status:');
      console.log('=====================================');
      
      const info = await AssetFolderSchedulerService.getSchedulerInfo();
      console.log('Scheduler Info:', JSON.stringify(info, null, 2));
      
      const status = await AssetFolderSchedulerService.getCronJobStatus();
      console.log('Cron Job Status:', JSON.stringify(status, null, 2));
      
      const settings = await AssetFolderSchedulerService.getSchedulerSettings();
      console.log('Settings:', JSON.stringify(settings, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      throw error;
    }
  }
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).AssetFolderSchedulerTest = AssetFolderSchedulerTest;
}
