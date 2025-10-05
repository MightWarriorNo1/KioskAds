import { supabase } from '../lib/supabaseClient';
import { GmailService } from '../services/gmailService';
import { CustomAdEmailService } from '../services/customAdEmailService';

export interface EmailDiagnosticResult {
  gmailConfigured: boolean;
  gmailConnectionTest: boolean;
  emailTemplatesExist: boolean;
  emailQueueStatus: {
    pending: number;
    sent: number;
    failed: number;
  };
  customAdTemplates: Array<{
    type: string;
    name: string;
    isActive: boolean;
  }>;
  issues: string[];
  recommendations: string[];
}

export class EmailDiagnosticTool {
  static async runFullDiagnostic(): Promise<EmailDiagnosticResult> {
    console.log('🔍 Running Email System Diagnostic...\n');
    
    const result: EmailDiagnosticResult = {
      gmailConfigured: false,
      gmailConnectionTest: false,
      emailTemplatesExist: false,
      emailQueueStatus: { pending: 0, sent: 0, failed: 0 },
      customAdTemplates: [],
      issues: [],
      recommendations: []
    };

    // 1. Check Gmail Configuration
    console.log('📧 Checking Gmail Configuration...');
    result.gmailConfigured = GmailService.isConfigured();
    console.log(`Gmail Configured: ${result.gmailConfigured ? '✅' : '❌'}`);

    if (result.gmailConfigured) {
      try {
        result.gmailConnectionTest = await GmailService.testConnection();
        console.log(`Gmail Connection Test: ${result.gmailConnectionTest ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`Gmail Connection Test: ❌ - ${error}`);
        result.issues.push('Gmail connection test failed');
      }
    } else {
      result.issues.push('Gmail service is not configured');
      result.recommendations.push('Configure Gmail integration in system settings');
    }

    // 2. Check Email Templates
    console.log('\n📋 Checking Email Templates...');
    try {
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('name, type, is_active')
        .like('type', 'custom_ad_%')
        .order('type');

      if (error) {
        result.issues.push(`Error fetching email templates: ${error.message}`);
      } else if (!templates || templates.length === 0) {
        result.issues.push('No custom ad email templates found');
        result.recommendations.push('Run database migrations to create email templates');
      } else {
        result.emailTemplatesExist = true;
        result.customAdTemplates = templates.map(t => ({
          type: t.type,
          name: t.name,
          isActive: t.is_active
        }));
        
        const inactiveTemplates = templates.filter(t => !t.is_active);
        if (inactiveTemplates.length > 0) {
          result.issues.push(`${inactiveTemplates.length} email templates are inactive`);
          result.recommendations.push('Activate inactive email templates');
        }
        
        console.log(`Found ${templates.length} custom ad email templates`);
        templates.forEach(t => {
          console.log(`  - ${t.name} (${t.type}) - ${t.is_active ? '✅ Active' : '❌ Inactive'}`);
        });
      }
    } catch (error) {
      result.issues.push(`Error checking email templates: ${error}`);
    }

    // 3. Check Email Queue Status
    console.log('\n📬 Checking Email Queue...');
    try {
      const { data: queueStats, error } = await supabase
        .from('email_queue')
        .select('status')
        .in('status', ['pending', 'sent', 'failed']);

      if (error) {
        result.issues.push(`Error checking email queue: ${error.message}`);
      } else {
        result.emailQueueStatus = {
          pending: queueStats?.filter(q => q.status === 'pending').length || 0,
          sent: queueStats?.filter(q => q.status === 'sent').length || 0,
          failed: queueStats?.filter(q => q.status === 'failed').length || 0
        };

        console.log(`Email Queue Status:`);
        console.log(`  - Pending: ${result.emailQueueStatus.pending}`);
        console.log(`  - Sent: ${result.emailQueueStatus.sent}`);
        console.log(`  - Failed: ${result.emailQueueStatus.failed}`);

        if (result.emailQueueStatus.pending > 0) {
          result.issues.push(`${result.emailQueueStatus.pending} emails are pending in queue`);
          result.recommendations.push('Process email queue or check email queue processor');
        }

        if (result.emailQueueStatus.failed > 0) {
          result.issues.push(`${result.emailQueueStatus.failed} emails failed to send`);
          result.recommendations.push('Check failed emails and retry or fix configuration');
        }
      }
    } catch (error) {
      result.issues.push(`Error checking email queue: ${error}`);
    }

    // 4. Check Recent Custom Ad Orders
    console.log('\n📦 Checking Recent Custom Ad Orders...');
    try {
      const { data: recentOrders, error } = await supabase
        .from('custom_ad_orders')
        .select('id, created_at, workflow_status, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        result.issues.push(`Error checking recent orders: ${error.message}`);
      } else if (recentOrders && recentOrders.length > 0) {
        console.log(`Found ${recentOrders.length} recent custom ad orders:`);
        recentOrders.forEach(order => {
          console.log(`  - Order ${order.id} (${order.workflow_status}) - ${new Date(order.created_at).toLocaleDateString()}`);
        });
      } else {
        result.issues.push('No recent custom ad orders found');
        result.recommendations.push('Create a test custom ad order to verify email notifications');
      }
    } catch (error) {
      result.issues.push(`Error checking recent orders: ${error}`);
    }

    // 5. Check System Integrations
    console.log('\n🔗 Checking System Integrations...');
    try {
      const { data: integrations, error } = await supabase
        .from('system_integrations')
        .select('type, status, config')
        .eq('type', 'gmail');

      if (error) {
        result.issues.push(`Error checking system integrations: ${error.message}`);
      } else if (!integrations || integrations.length === 0) {
        result.issues.push('No Gmail integration found in system_integrations');
        result.recommendations.push('Set up Gmail integration in admin settings');
      } else {
        const gmailIntegration = integrations[0];
        console.log(`Gmail Integration Status: ${gmailIntegration.status}`);
        if (gmailIntegration.status !== 'connected') {
          result.issues.push('Gmail integration is not connected');
          result.recommendations.push('Connect Gmail integration in admin settings');
        }
      }
    } catch (error) {
      result.issues.push(`Error checking system integrations: ${error}`);
    }

    // Generate Summary
    console.log('\n📊 Diagnostic Summary:');
    console.log('====================');
    
    if (result.issues.length === 0) {
      console.log('✅ No issues found! Email system appears to be working correctly.');
    } else {
      console.log(`❌ Found ${result.issues.length} issues:`);
      result.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    return result;
  }

  static async testEmailSending(testEmail: string): Promise<boolean> {
    console.log(`🧪 Testing email sending to ${testEmail}...`);
    
    try {
      // Test custom ad submitted email
      const success = await CustomAdEmailService.sendTestEmail('custom_ad_submitted', testEmail);
      
      if (success) {
        console.log('✅ Test email sent successfully');
        return true;
      } else {
        console.log('❌ Test email failed to send');
        return false;
      }
    } catch (error) {
      console.log(`❌ Test email error: ${error}`);
      return false;
    }
  }

  static async processEmailQueue(): Promise<{ sent: number; failed: number }> {
    console.log('📬 Processing email queue...');
    
    try {
      if (GmailService.isConfigured()) {
        await GmailService.processEmailQueue();
        console.log('✅ Email queue processed locally');
        return { sent: 0, failed: 0 }; // GmailService doesn't return counts
      } else {
        // Try to invoke the edge function
        const { data, error } = await supabase.functions.invoke('email-queue-processor');
        
        if (error) {
          console.log(`❌ Error invoking email queue processor: ${error.message}`);
          return { sent: 0, failed: 0 };
        } else {
          console.log('✅ Email queue processor invoked successfully');
          return data || { sent: 0, failed: 0 };
        }
      }
    } catch (error) {
      console.log(`❌ Error processing email queue: ${error}`);
      return { sent: 0, failed: 0 };
    }
  }

  static async checkFailedEmails(): Promise<void> {
    console.log('🔍 Checking failed emails...');
    
    try {
      const { data: failedEmails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log(`❌ Error checking failed emails: ${error.message}`);
        return;
      }

      if (!failedEmails || failedEmails.length === 0) {
        console.log('✅ No failed emails found');
        return;
      }

      console.log(`❌ Found ${failedEmails.length} failed emails:`);
      failedEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.recipient_email} - ${email.subject}`);
        console.log(`     Error: ${email.error_message || 'No error message'}`);
        console.log(`     Retry Count: ${email.retry_count}/${email.max_retries}`);
        console.log(`     Created: ${new Date(email.created_at).toLocaleString()}`);
        console.log('');
      });
    } catch (error) {
      console.log(`❌ Error checking failed emails: ${error}`);
    }
  }

  static async fixCommonIssues(): Promise<void> {
    console.log('🔧 Attempting to fix common issues...');
    
    try {
      // 1. Activate inactive email templates
      const { data: inactiveTemplates, error: fetchError } = await supabase
        .from('email_templates')
        .select('id, name, type')
        .eq('is_active', false)
        .like('type', 'custom_ad_%');

      if (fetchError) {
        console.log(`❌ Error fetching inactive templates: ${fetchError.message}`);
        return;
      }

      if (inactiveTemplates && inactiveTemplates.length > 0) {
        console.log(`🔧 Activating ${inactiveTemplates.length} inactive email templates...`);
        
        const { error: updateError } = await supabase
          .from('email_templates')
          .update({ is_active: true })
          .in('id', inactiveTemplates.map(t => t.id));

        if (updateError) {
          console.log(`❌ Error activating templates: ${updateError.message}`);
        } else {
          console.log('✅ Email templates activated successfully');
        }
      }

      // 2. Retry failed emails
      const { data: failedEmails, error: failedError } = await supabase
        .from('email_queue')
        .select('id')
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (failedError) {
        console.log(`❌ Error fetching failed emails: ${failedError.message}`);
        return;
      }

      if (failedEmails && failedEmails.length > 0) {
        console.log(`🔧 Retrying ${failedEmails.length} failed emails...`);
        
        const { error: retryError } = await supabase
          .from('email_queue')
          .update({ 
            status: 'pending',
            retry_count: 0,
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .in('id', failedEmails.map(e => e.id));

        if (retryError) {
          console.log(`❌ Error retrying emails: ${retryError.message}`);
        } else {
          console.log('✅ Failed emails reset to pending status');
        }
      }

      console.log('✅ Common issues fix attempt completed');
    } catch (error) {
      console.log(`❌ Error fixing common issues: ${error}`);
    }
  }
}

// Example usage:
// EmailDiagnosticTool.runFullDiagnostic();
// EmailDiagnosticTool.testEmailSending('test@example.com');
// EmailDiagnosticTool.processEmailQueue();
// EmailDiagnosticTool.checkFailedEmails();
// EmailDiagnosticTool.fixCommonIssues();
