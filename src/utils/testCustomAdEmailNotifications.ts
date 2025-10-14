import { CustomAdCreationEmailService, CustomAdCreationEmailData } from '../services/customAdCreationEmailService';

/**
 * Test utility for Custom Ad Creation email notifications
 * This file demonstrates how to test the email notification system
 * for all workflow states in the Custom Ad Creation process.
 */

export class CustomAdEmailNotificationTester {
  // Test data for email notifications
  private static getTestCreationData(): CustomAdCreationEmailData {
    return {
      id: 'test-creation-123',
      title: 'Social Media Campaign for New Product Launch',
      description: 'Create engaging social media content for our new eco-friendly product line',
      category: 'Social Media Campaign',
      priority: 'high',
      budget_range: '$2,500 - $5,000',
      deadline: '2024-01-15',
      special_requirements: 'Must align with brand guidelines and include sustainability messaging',
      target_audience: 'Eco-conscious millennials and Gen Z',
      brand_guidelines: 'Use green color palette, modern typography, and natural imagery',
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: 'user-123',
        full_name: 'John Smith',
        email: 'john.smith@example.com',
        company_name: 'EcoTech Solutions'
      },
      designer: {
        id: 'designer-456',
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com'
      }
    };
  }

  // Test purchased notification (Client/Host to Admin)
  static async testPurchasedNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Purchased Notification...');
    
    try {
      const testData = this.getTestCreationData();
      await CustomAdCreationEmailService.sendPurchasedNotification(testData);
      console.log('✅ Purchased notification test completed successfully');
    } catch (error) {
      console.error('❌ Purchased notification test failed:', error);
    }
  }

  // Test assigned notification (Admin to Designer)
  static async testAssignedNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Assigned Notification...');
    
    try {
      const testData = this.getTestCreationData();
      await CustomAdCreationEmailService.sendAssignedNotification(testData);
      console.log('✅ Assigned notification test completed successfully');
    } catch (error) {
      console.error('❌ Assigned notification test failed:', error);
    }
  }

  // Test proof submitted notification (Designer to Client/Host with Admin copy)
  static async testProofSubmittedNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Proof Submitted Notification...');
    
    try {
      const testData = this.getTestCreationData();
      await CustomAdCreationEmailService.sendProofSubmittedNotification(testData);
      console.log('✅ Proof submitted notification test completed successfully');
    } catch (error) {
      console.error('❌ Proof submitted notification test failed:', error);
    }
  }

  // Test approved notification (Client/Host to Designer with Admin copy)
  static async testApprovedNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Approved Notification...');
    
    try {
      const testData = this.getTestCreationData();
      await CustomAdCreationEmailService.sendApprovedNotification(testData);
      console.log('✅ Approved notification test completed successfully');
    } catch (error) {
      console.error('❌ Approved notification test failed:', error);
    }
  }

  // Test admin approval notification specifically
  static async testAdminApprovalNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Admin Approval Notification...');
    
    try {
      const testData = this.getTestCreationData();
      testData.status = 'approved';
      await CustomAdCreationEmailService.sendApprovedNotification(testData);
      console.log('✅ Admin approval notification test completed successfully');
      console.log('📧 Admin should receive email with campaign creation instructions');
    } catch (error) {
      console.error('❌ Admin approval notification test failed:', error);
    }
  }

  // Test request changes notification (Client/Host to Designer with Admin copy)
  static async testRequestChangesNotification(): Promise<void> {
    console.log('Testing Custom Ad Creation Request Changes Notification...');
    
    try {
      const testData = this.getTestCreationData();
      await CustomAdCreationEmailService.sendRequestChangesNotification(testData);
      console.log('✅ Request changes notification test completed successfully');
    } catch (error) {
      console.error('❌ Request changes notification test failed:', error);
    }
  }

  // Run all email notification tests
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Custom Ad Creation Email Notification Tests...\n');
    
    await this.testPurchasedNotification();
    console.log('');
    
    await this.testAssignedNotification();
    console.log('');
    
    await this.testProofSubmittedNotification();
    console.log('');
    
    await this.testApprovedNotification();
    console.log('');
    
    await this.testAdminApprovalNotification();
    console.log('');
    
    await this.testRequestChangesNotification();
    console.log('');
    
    console.log('🎉 All Custom Ad Creation email notification tests completed!');
  }

  // Test email template creation
  static async testTemplateCreation(): Promise<void> {
    console.log('Testing Custom Ad Creation Email Template Creation...');
    
    try {
      await CustomAdCreationEmailService.createDefaultTemplates();
      console.log('✅ Email templates created successfully');
    } catch (error) {
      console.error('❌ Email template creation failed:', error);
    }
  }
}

// Example usage:
// CustomAdEmailNotificationTester.runAllTests();
// CustomAdEmailNotificationTester.testTemplateCreation();
