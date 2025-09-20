import { CustomAdEmailService } from '../services/customAdEmailService';

/**
 * Test script for custom ad email notifications
 * This script can be run to test all email templates
 */
export class CustomAdEmailTester {
  static async testAllTemplates(testEmail: string): Promise<void> {
    console.log('🧪 Testing Custom Ad Email Notifications...\n');

    const templates = [
      'custom_ad_submitted',
      'custom_ad_rejected',
      'custom_ad_approved',
      'custom_ad_designer_assigned',
      'custom_ad_proofs_ready',
      'custom_ad_proof_approved',
      'custom_ad_proof_rejected',
      'custom_ad_completed',
      'custom_ad_designer_assignment',
      'custom_ad_designer_rejection'
    ];

    const results: { template: string; success: boolean; error?: string }[] = [];

    for (const template of templates) {
      try {
        console.log(`📧 Testing ${template}...`);
        const success = await CustomAdEmailService.sendTestEmail(template, testEmail);
        results.push({ template, success });
        
        if (success) {
          console.log(`✅ ${template} - Test email sent successfully`);
        } else {
          console.log(`❌ ${template} - Failed to send test email`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${template} - Error: ${errorMessage}`);
        results.push({ template, success: false, error: errorMessage });
      }
    }

    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Templates:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.template}: ${r.error || 'Unknown error'}`);
        });
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Check your email inbox for test emails');
    console.log('2. Verify email formatting and content');
    console.log('3. Check email queue in database if emails are not received');
    console.log('4. Verify Gmail integration is properly configured');
  }

  static async testSpecificTemplate(templateType: string, testEmail: string): Promise<boolean> {
    console.log(`🧪 Testing ${templateType} template...`);
    
    try {
      const success = await CustomAdEmailService.sendTestEmail(templateType, testEmail);
      
      if (success) {
        console.log(`✅ ${templateType} - Test email sent successfully`);
      } else {
        console.log(`❌ ${templateType} - Failed to send test email`);
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${templateType} - Error: ${errorMessage}`);
      return false;
    }
  }

  static async checkEmailQueue(): Promise<void> {
    console.log('📬 Checking email queue...');
    
    try {
      const { supabase } = await import('../lib/supabaseClient');
      
      const { data: queue, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log(`❌ Error checking email queue: ${error.message}`);
        return;
      }

      if (!queue || queue.length === 0) {
        console.log('✅ Email queue is empty - no pending emails');
        return;
      }

      console.log(`📧 Found ${queue.length} pending emails:`);
      queue.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.recipient_email} - ${email.subject} (${email.status})`);
      });
    } catch (error) {
      console.log(`❌ Error checking email queue: ${error}`);
    }
  }

  static async checkEmailTemplates(): Promise<void> {
    console.log('📋 Checking email templates...');
    
    try {
      const { supabase } = await import('../lib/supabaseClient');
      
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('name, type, is_active')
        .like('type', 'custom_ad_%')
        .order('type');

      if (error) {
        console.log(`❌ Error checking email templates: ${error.message}`);
        return;
      }

      if (!templates || templates.length === 0) {
        console.log('❌ No custom ad email templates found');
        return;
      }

      console.log(`📧 Found ${templates.length} custom ad email templates:`);
      templates.forEach((template, index) => {
        const status = template.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`  ${index + 1}. ${template.name} (${template.type}) - ${status}`);
      });
    } catch (error) {
      console.log(`❌ Error checking email templates: ${error}`);
    }
  }
}

// Example usage:
// CustomAdEmailTester.testAllTemplates('test@example.com');
// CustomAdEmailTester.testSpecificTemplate('custom_ad_submitted', 'test@example.com');
// CustomAdEmailTester.checkEmailQueue();
// CustomAdEmailTester.checkEmailTemplates();
