import { supabase } from '../lib/supabaseClient';

/**
 * Test script for email queue processor
 * This tests the email sending functionality when Gmail is not configured on frontend
 */
export class EmailQueueProcessorTester {
  static async testEmailQueueProcessor(): Promise<void> {
    console.log('🧪 Testing Email Queue Processor...');
    console.log('===================================');
    
    try {
      // Add a test email to the queue
      console.log('📧 Adding test email to queue...');
      
      const { data, error } = await supabase
        .from('email_queue')
        .insert({
          recipient_email: 'test@example.com',
          subject: 'Test Email from Queue Processor',
          body_html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Test Email</h2>
              <p>Hello,</p>
              <p>This is a test email sent via the email queue processor.</p>
              <p>If you receive this email, the queue processor is working correctly!</p>
              <p>Best regards,<br>EZ Kiosk Ads Team</p>
            </div>
          `,
          body_text: 'Test Email - This is a test email sent via the email queue processor.',
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error adding test email to queue:', error);
        return;
      }

      console.log('✅ Test email added to queue:', data);

      // Trigger the email queue processor
      console.log('📧 Triggering email queue processor...');
      
      const { data: processorData, error: processorError } = await supabase.functions.invoke('email-queue-processor');

      if (processorError) {
        console.error('❌ Email queue processor error:', processorError);
        return;
      }

      console.log('✅ Email queue processor response:', processorData);

      // Check the queue status
      console.log('📬 Checking email queue status...');
      
      const { data: queueData, error: queueError } = await supabase
        .from('email_queue')
        .select('*')
        .eq('recipient_email', 'test@example.com')
        .order('created_at', { ascending: false })
        .limit(1);

      if (queueError) {
        console.error('❌ Error checking queue status:', queueError);
        return;
      }

      if (queueData && queueData.length > 0) {
        const email = queueData[0];
        console.log('📧 Email status:', email.status);
        console.log('📧 Created at:', email.created_at);
        console.log('📧 Updated at:', email.updated_at);
        
        if (email.status === 'sent') {
          console.log('✅ Email was sent successfully!');
        } else if (email.status === 'failed') {
          console.log('❌ Email sending failed');
        } else {
          console.log('⏳ Email is still pending');
        }
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  static async checkEmailQueueStatus(): Promise<void> {
    console.log('📬 Checking Email Queue Status...');
    console.log('================================');
    
    try {
      const { data: queue, error } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error checking email queue:', error);
        return;
      }

      if (!queue || queue.length === 0) {
        console.log('✅ Email queue is empty');
        return;
      }

      console.log(`📧 Found ${queue.length} emails in queue:`);
      
      const statusCounts = queue.reduce((acc: any, email: any) => {
        acc[email.status] = (acc[email.status] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Status breakdown:', statusCounts);

      queue.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.recipient_email} - ${email.subject} (${email.status})`);
        console.log(`     Created: ${email.created_at}`);
        if (email.updated_at !== email.created_at) {
          console.log(`     Updated: ${email.updated_at}`);
        }
      });

    } catch (error) {
      console.error('❌ Error checking email queue status:', error);
    }
  }

  static async runFullTest(): Promise<void> {
    console.log('🚀 Running Full Email Queue Processor Test...');
    console.log('============================================');
    console.log('');
    
    await this.checkEmailQueueStatus();
    console.log('');
    
    await this.testEmailQueueProcessor();
    console.log('');
    
    console.log('🎉 Full test completed!');
    console.log('');
    console.log('📋 What to check:');
    console.log('1. Look for "Email queue processor response" in the logs');
    console.log('2. Check if the test email status changed to "sent"');
    console.log('3. Verify that emails are being processed by the edge function');
    console.log('4. Check your email inbox for the test email');
  }
}

// Example usage:
// EmailQueueProcessorTester.runFullTest();
// EmailQueueProcessorTester.testEmailQueueProcessor();
// EmailQueueProcessorTester.checkEmailQueueStatus();
