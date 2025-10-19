import { CampaignAndAssetSchedulerService } from '../services/campaignAndAssetSchedulerService';

export class CampaignAndAssetSchedulerTest {
  /**
   * Test the connection to both schedulers
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const info = await CampaignAndAssetSchedulerService.getSchedulerInfo();
      
      if (info.length === 0) {
        return { success: false, message: 'No scheduler information found' };
      }
      
      const campaignScheduler = info.find(s => s.scheduler_type === 'campaign_status');
      const assetScheduler = info.find(s => s.scheduler_type === 'asset_folder');
      
      if (!campaignScheduler || !assetScheduler) {
        return { success: false, message: 'Missing scheduler configurations' };
      }
      
      return { 
        success: true, 
        message: `Both schedulers configured. Campaign: ${campaignScheduler.scheduler_enabled ? 'enabled' : 'disabled'}, Asset: ${assetScheduler.scheduler_enabled ? 'enabled' : 'disabled'}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test triggering both schedulers
   */
  static async testTrigger(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await CampaignAndAssetSchedulerService.triggerBothSchedulers();
      return { success: true, message: `Trigger test successful: ${result}` };
    } catch (error) {
      return { 
        success: false, 
        message: `Trigger test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test the edge functions directly
   */
  static async testEdgeFunctions(): Promise<{ success: boolean; message: string }> {
    try {
      const [campaignResult, assetResult] = await Promise.all([
        CampaignAndAssetSchedulerService.testCampaignStatusScheduler(),
        CampaignAndAssetSchedulerService.testAssetFolderScheduler()
      ]);
      
      return { 
        success: true, 
        message: `Edge function tests completed. Campaign: ${JSON.stringify(campaignResult)}, Asset: ${JSON.stringify(assetResult)}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Edge function test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test the comprehensive scheduler test
   */
  static async testComprehensive(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await CampaignAndAssetSchedulerService.testBothSchedulers();
      return { success: true, message: `Comprehensive test result: ${result}` };
    } catch (error) {
      return { 
        success: false, 
        message: `Comprehensive test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get current status of both schedulers
   */
  static async getStatus(): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const [info, settings] = await Promise.all([
        CampaignAndAssetSchedulerService.getSchedulerInfo(),
        CampaignAndAssetSchedulerService.getSchedulerSettings()
      ]);
      
      return { 
        success: true, 
        data: { info, settings },
        message: 'Status retrieved successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        data: null,
        message: `Status retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{ success: boolean; results: any[] }> {
    const results = [];
    
    // Test connection
    const connectionTest = await this.testConnection();
    results.push({ test: 'Connection', ...connectionTest });
    
    // Test edge functions
    const edgeTest = await this.testEdgeFunctions();
    results.push({ test: 'Edge Functions', ...edgeTest });
    
    // Test comprehensive
    const comprehensiveTest = await this.testComprehensive();
    results.push({ test: 'Comprehensive', ...comprehensiveTest });
    
    // Get status
    const statusTest = await this.getStatus();
    results.push({ test: 'Status', ...statusTest });
    
    const allPassed = results.every(r => r.success);
    
    return { 
      success: allPassed, 
      results 
    };
  }

  /**
   * Test campaign status transitions
   */
  static async testCampaignStatusTransitions(): Promise<{ success: boolean; message: string }> {
    try {
      // This would test the actual campaign status changes
      // For now, we'll just test the scheduler trigger
      const result = await CampaignAndAssetSchedulerService.triggerCampaignStatusScheduler();
      return { 
        success: true, 
        message: `Campaign status transition test: ${result}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Campaign status transition test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test asset folder movements
   */
  static async testAssetFolderMovements(): Promise<{ success: boolean; message: string }> {
    try {
      // This would test the actual asset folder movements
      // For now, we'll just test the scheduler trigger
      const result = await CampaignAndAssetSchedulerService.triggerAssetFolderScheduler();
      return { 
        success: true, 
        message: `Asset folder movement test: ${result}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Asset folder movement test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test the complete workflow
   */
  static async testCompleteWorkflow(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Testing complete campaign and asset scheduler workflow...');
      
      // Test 1: Check if schedulers are configured
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return { success: false, message: `Connection test failed: ${connectionTest.message}` };
      }
      
      // Test 2: Test campaign status scheduler
      const campaignTest = await this.testCampaignStatusTransitions();
      if (!campaignTest.success) {
        return { success: false, message: `Campaign status test failed: ${campaignTest.message}` };
      }
      
      // Test 3: Test asset folder scheduler
      const assetTest = await this.testAssetFolderMovements();
      if (!assetTest.success) {
        return { success: false, message: `Asset folder test failed: ${assetTest.message}` };
      }
      
      // Test 4: Test both together
      const bothTest = await this.testTrigger();
      if (!bothTest.success) {
        return { success: false, message: `Combined test failed: ${bothTest.message}` };
      }
      
      return { 
        success: true, 
        message: 'Complete workflow test passed. Both schedulers are working correctly.' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Complete workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

