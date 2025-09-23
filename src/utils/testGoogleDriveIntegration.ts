import { GoogleDriveService } from '../services/googleDriveService';
import { GoogleDriveApiServiceBrowser as GoogleDriveApiService } from '../services/googleDriveApiServiceBrowser';
import { GoogleDriveConfig } from '../types/database';

/**
 * Test utility for Google Drive integration
 * This file should be used for testing the real Google Drive API integration
 */
export class GoogleDriveIntegrationTester {
  /**
   * Test the complete Google Drive integration flow
   */
  static async testCompleteIntegration(config: GoogleDriveConfig): Promise<{
    success: boolean;
    results: {
      connectionTest: boolean;
      folderCreation: boolean;
      fileUpload: boolean;
      fileMovement: boolean;
      error?: string;
    };
  }> {
    const results = {
      connectionTest: false,
      folderCreation: false,
      fileUpload: false,
      fileMovement: false
    };

    try {
      console.log('🧪 Starting Google Drive integration test...');

      // Test 1: Connection Test
      console.log('📡 Testing Google Drive connection...');
      const connectionResult = await GoogleDriveService.testConnection(config);
      results.connectionTest = connectionResult.success;
      
      if (!connectionResult.success) {
        throw new Error(`Connection test failed: ${connectionResult.message}`);
      }
      console.log('✅ Connection test passed');

      // Test 2: Folder Creation
      console.log('📁 Testing folder creation...');
      const testFolder = await GoogleDriveApiService.createFolder(
        config,
        `Test Folder - ${Date.now()}`,
        undefined
      );
      results.folderCreation = !!testFolder.id;
      
      if (!testFolder.id) {
        throw new Error('Folder creation failed: No folder ID returned');
      }
      console.log('✅ Folder creation test passed');

      // Test 3: File Upload (using a test file)
      console.log('📤 Testing file upload...');
      const testContent = Buffer.from('This is a test file for Google Drive integration');
      const testFileName = `test-file-${Date.now()}.txt`;
      
      const uploadedFile = await GoogleDriveApiService.uploadFileFromBuffer(
        config,
        testContent,
        testFileName,
        'text/plain',
        testFolder.id
      );
      results.fileUpload = !!uploadedFile.id;
      
      if (!uploadedFile.id) {
        throw new Error('File upload failed: No file ID returned');
      }
      console.log('✅ File upload test passed');

      // Test 4: File Movement
      console.log('🔄 Testing file movement...');
      const archiveFolder = await GoogleDriveApiService.createFolder(
        config,
        `Archive Folder - ${Date.now()}`,
        undefined
      );
      
      await GoogleDriveApiService.moveFile(
        config,
        uploadedFile.id,
        testFolder.id,
        archiveFolder.id
      );
      results.fileMovement = true;
      console.log('✅ File movement test passed');

      // Cleanup: Delete test files and folders
      console.log('🧹 Cleaning up test files...');
      try {
        await GoogleDriveApiService.deleteFile(config, uploadedFile.id);
        await GoogleDriveApiService.deleteFile(config, testFolder.id);
        await GoogleDriveApiService.deleteFile(config, archiveFolder.id);
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed (this is not critical):', cleanupError);
      }

      console.log('🎉 All Google Drive integration tests passed!');
      return { success: true, results };

    } catch (error) {
      console.error('❌ Google Drive integration test failed:', error);
      return { 
        success: false, 
        results,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test specific Google Drive service methods
   */
  static async testServiceMethods(config: GoogleDriveConfig): Promise<{
    success: boolean;
    methodResults: { [key: string]: boolean };
    errors: { [key: string]: string };
  }> {
    const methodResults: { [key: string]: boolean } = {};
    const errors: { [key: string]: string } = {};

    // Test connection
    try {
      const connectionResult = await GoogleDriveService.testConnection(config);
      methodResults.connectionTest = connectionResult.success;
      if (!connectionResult.success) {
        errors.connectionTest = connectionResult.message;
      }
    } catch (error) {
      methodResults.connectionTest = false;
      errors.connectionTest = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test folder creation
    try {
      const folder = await GoogleDriveApiService.createFolder(
        config,
        `Service Test Folder - ${Date.now()}`
      );
      methodResults.folderCreation = !!folder.id;
      if (folder.id) {
        // Clean up
        await GoogleDriveApiService.deleteFile(config, folder.id);
      }
    } catch (error) {
      methodResults.folderCreation = false;
      errors.folderCreation = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test file listing
    try {
      const files = await GoogleDriveApiService.listFiles(config, undefined, 5);
      methodResults.fileListing = Array.isArray(files);
  } catch (error) {
      methodResults.fileListing = false;
      errors.fileListing = error instanceof Error ? error.message : 'Unknown error';
    }

    const success = Object.values(methodResults).every(result => result === true);

    return {
      success,
      methodResults,
      errors
    };
  }

  /**
   * Validate Google Drive configuration
   */
  static validateConfig(config: GoogleDriveConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.client_id || config.client_id.trim() === '') {
      errors.push('Client ID is required');
    }

    if (!config.client_secret || config.client_secret.trim() === '') {
      errors.push('Client Secret is required');
    }

    if (!config.refresh_token || config.refresh_token.trim() === '') {
      errors.push('Refresh Token is required');
    }

    if (!config.name || config.name.trim() === '') {
      errors.push('Configuration name is required');
    }

    // Validate client ID format (should be a Google OAuth client ID)
    if (config.client_id && !config.client_id.includes('.apps.googleusercontent.com')) {
      errors.push('Client ID does not appear to be a valid Google OAuth client ID');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate test report
   */
  static generateTestReport(testResults: any): string {
    const report = [
      'Google Drive Integration Test Report',
      '=====================================',
      '',
      `Overall Success: ${testResults.success ? '✅ PASSED' : '❌ FAILED'}`,
      '',
      'Test Results:',
      `- Connection Test: ${testResults.results?.connectionTest ? '✅ PASSED' : '❌ FAILED'}`,
      `- Folder Creation: ${testResults.results?.folderCreation ? '✅ PASSED' : '❌ FAILED'}`,
      `- File Upload: ${testResults.results?.fileUpload ? '✅ PASSED' : '❌ FAILED'}`,
      `- File Movement: ${testResults.results?.fileMovement ? '✅ PASSED' : '❌ FAILED'}`,
      ''
    ];

    if (testResults.error) {
      report.push('Error Details:');
      report.push(`- ${testResults.error}`);
      report.push('');
    }

    if (testResults.methodResults) {
      report.push('Method Test Results:');
      Object.entries(testResults.methodResults).forEach(([method, result]) => {
        report.push(`- ${method}: ${result ? '✅ PASSED' : '❌ FAILED'}`);
      });
      report.push('');
    }

    if (testResults.errors && Object.keys(testResults.errors).length > 0) {
      report.push('Method Errors:');
      Object.entries(testResults.errors).forEach(([method, error]) => {
        report.push(`- ${method}: ${error}`);
      });
      report.push('');
    }

    report.push('Test completed at:', new Date().toISOString());

    return report.join('\n');
  }
}
