import { CustomAdEmailService } from '../services/customAdEmailService';

/**
 * Test script for designer message notifications
 * Run this to test if the email notification system is working
 */
export class DesignerMessageNotificationTester {
  static async testDesignerMessageNotification(): Promise<void> {
    console.log('🧪 Testing Designer Message Notification...');
    console.log('==========================================');
    
    try {
      // Test with a sample order ID (you can change this to a real order ID)
      const testOrderId = 'test-order-123';
      const testMessage = 'Hello, I have some feedback on the design. Can you make the logo bigger?';
      const testSenderName = 'John Smith';
      const testSenderRole = 'client';
      
      console.log('📧 Test Parameters:');
      console.log('- Order ID:', testOrderId);
      console.log('- Message:', testMessage);
      console.log('- Sender:', testSenderName);
      console.log('- Role:', testSenderRole);
      console.log('');
      
      console.log('📧 Calling sendDesignerMessageNotification...');
      await CustomAdEmailService.sendDesignerMessageNotification(
        testOrderId,
        testMessage,
        testSenderName,
        testSenderRole
      );
      
      console.log('✅ Test completed - check console for detailed logs');
      console.log('');
      console.log('📋 What to check:');
      console.log('1. Look for console logs starting with 📧');
      console.log('2. Check if Gmail is configured (should see Gmail status)');
      console.log('3. If Gmail not configured, email should be queued');
      console.log('4. Check email_queue table in database for queued emails');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  static async checkGmailConfiguration(): Promise<void> {
    console.log('🔧 Checking Gmail Configuration...');
    console.log('==================================');
    
    try {
      const { GmailService } = await import('../services/gmailService');
      
      console.log('Gmail configured:', GmailService.isConfigured());
      
      if (!GmailService.isConfigured()) {
        console.log('⚠️ Gmail is not configured');
        console.log('📧 Emails will be queued for later sending');
        console.log('🔧 To configure Gmail, check your environment variables or system integrations');
      } else {
        console.log('✅ Gmail is configured and ready to send emails');
      }
    } catch (error) {
      console.error('❌ Error checking Gmail configuration:', error);
    }
  }

  static async checkEmailQueue(): Promise<void> {
    console.log('📬 Checking Email Queue...');
    console.log('=========================');
    
    try {
      const { supabase } = await import('../lib/supabaseClient');
      
      const { data: queue, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('❌ Error checking email queue:', error.message);
        return;
      }

      if (!queue || queue.length === 0) {
        console.log('✅ Email queue is empty - no pending emails');
      } else {
        console.log(`📧 Found ${queue.length} pending emails:`);
        queue.forEach((email, index) => {
          console.log(`  ${index + 1}. ${email.recipient_email} - ${email.subject} (${email.status})`);
        });
      }
    } catch (error) {
      console.error('❌ Error checking email queue:', error);
    }
  }

  static async runFullTest(): Promise<void> {
    console.log('🚀 Running Full Designer Message Notification Test...');
    console.log('==================================================');
    console.log('');
    
    await this.checkGmailConfiguration();
    console.log('');
    
    await this.testDesignerMessageNotification();
    console.log('');
    
    await this.checkEmailQueue();
    console.log('');
    
    console.log('🎉 Full test completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Check the console logs above for any errors');
    console.log('2. If Gmail is not configured, emails will be queued');
    console.log('3. Check the email_queue table in your database');
    console.log('4. Configure Gmail integration if needed');
  }
}

// Example usage:
// DesignerMessageNotificationTester.runFullTest();
// DesignerMessageNotificationTester.testDesignerMessageNotification();
// DesignerMessageNotificationTester.checkGmailConfiguration();
// DesignerMessageNotificationTester.checkEmailQueue();
