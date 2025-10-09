/*eslint-disable */
import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

export interface CouponEmailData {
  email: string;
  name: string;
  couponCode: string;
  marketingToolId: string;
  marketingToolTitle: string;
}

export interface CouponEmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  is_active: boolean;
}

export class CouponEmailService {
  // Send coupon code email to user
  static async sendCouponCodeEmail(emailData: CouponEmailData): Promise<boolean> {
    try {
      console.log('Starting coupon email send process...', emailData);
      
      const template = await this.getEmailTemplate('coupon_code_delivery');
      if (!template) {
        console.error('Coupon email template not found - creating fallback');
        // Create a fallback template if none exists
        const fallbackTemplate = {
          id: 'fallback',
          name: 'Fallback Coupon Template',
          type: 'coupon_code_delivery',
          subject: 'Your Exclusive Coupon Code - {{coupon_code}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">🎉 Your Coupon Code is Here!</h1>
              <p>Dear {{recipient_name}},</p>
              <p>Thank you for your interest in our services! As promised, here's your exclusive coupon code:</p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
                <h2 style="color: white; font-size: 36px; margin: 0; letter-spacing: 3px;">{{coupon_code}}</h2>
                <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Use this code at checkout</p>
              </div>
              <p>Best regards,<br>EZ Kiosk Ads Team</p>
            </div>
          `,
          body_text: `Dear {{recipient_name}},\n\nYour coupon code: {{coupon_code}}\n\nBest regards,\nEZ Kiosk Ads Team`,
          variables: ['recipient_name', 'coupon_code', 'marketing_tool_title'],
          is_active: true
        };
        
        await this.sendEmail(fallbackTemplate, emailData.email, emailData.name, {
          recipient_name: emailData.name,
          coupon_code: emailData.couponCode,
          marketing_tool_title: emailData.marketingToolTitle
        });
      } else {
        console.log('Found email template:', template.name);
        const variables = {
          recipient_name: emailData.name,
          coupon_code: emailData.couponCode,
          marketing_tool_title: emailData.marketingToolTitle
        };

        await this.sendEmail(template, emailData.email, emailData.name, variables);
      }
      
      // Log the email send for tracking
      await this.logCouponEmailSent(emailData);
      
      console.log('Coupon email sent successfully to:', emailData.email);
      return true;
    } catch (error) {
      console.error('Error sending coupon code email:', error);
      return false;
    }
  }

  // Get email template by type
  private static async getEmailTemplate(type: string): Promise<CouponEmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting email template:', error);
      return null;
    }
  }

  // Send email using template
  private static async sendEmail(template: CouponEmailTemplate, to: string, toName: string, variables: Record<string, string>): Promise<void> {
    try {
      console.log('Gmail configured:', GmailService.isConfigured());
      console.log('Sending email to:', to);
      
      if (!GmailService.isConfigured()) {
        console.log('Gmail not configured, queuing email...');
        // Queue email for later sending
        await this.queueEmail(template, to, toName, variables);
        return;
      }

      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.body_html, variables);
      const textBody = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

      console.log('Sending email with subject:', subject);
      await GmailService.sendEmail(to, subject, htmlBody, textBody);
      console.log('Email sent successfully via Gmail');
    } catch (error) {
      console.error('Error sending email:', error);
      console.log('Queuing email for retry...');
      // Queue email for retry
      await this.queueEmail(template, to, toName, variables);
    }
  }

  // Queue email for later sending
  private static async queueEmail(template: CouponEmailTemplate, to: string, toName: string, variables: Record<string, string>): Promise<void> {
    try {
      console.log('Queuing email for:', to);
      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.body_html, variables);
      const textBody = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

      const { data, error } = await supabase
        .from('email_queue')
        .insert({
          template_id: template.id,
          recipient_email: to,
          recipient_name: toName,
          subject,
          body_html: htmlBody,
          body_text: textBody,
          status: 'pending',
          retry_count: 0,
          max_retries: 3
        });

      if (error) {
        console.error('Error inserting into email queue:', error);
        throw error;
      }

      console.log('Email queued successfully:', data);

      // Attempt immediate delivery if Gmail is configured
      try {
        if (GmailService.isConfigured()) {
          console.log('Processing email queue...');
          await GmailService.processEmailQueue();
        } else {
          console.log('Invoking email queue processor...');
          try { await supabase.functions.invoke('email-queue-processor'); } catch (e) {
            console.log('Email queue processor not available:', e);
          }
        }
      } catch (e) {
        console.log('Error processing email queue:', e);
      }
    } catch (error) {
      console.error('Error queuing email:', error);
    }
  }

  // Replace template variables and remove any remaining placeholders
  private static replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    
    // First, replace all known variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const replacement = value !== null && value !== undefined ? value : '';
      result = result.replace(regex, replacement);
    }
    
    // Then, remove any remaining placeholders that weren't replaced
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    
    return result;
  }

  // Log coupon email sent for tracking
  private static async logCouponEmailSent(emailData: CouponEmailData): Promise<void> {
    try {
      await supabase
        .from('coupon_email_logs')
        .insert({
          marketing_tool_id: emailData.marketingToolId,
          recipient_email: emailData.email,
          recipient_name: emailData.name,
          coupon_code: emailData.couponCode,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging coupon email:', error);
    }
  }

  // Get coupon email statistics
  static async getCouponEmailStats(marketingToolId?: string): Promise<{
    total_sent: number;
    unique_recipients: number;
    recent_sends: any[];
  }> {
    try {
      let query = supabase
        .from('coupon_email_logs')
        .select('*');

      if (marketingToolId) {
        query = query.eq('marketing_tool_id', marketingToolId);
      }

      const { data, error } = await query
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const uniqueEmails = new Set(data?.map(log => log.recipient_email) || []);
      
      return {
        total_sent: data?.length || 0,
        unique_recipients: uniqueEmails.size,
        recent_sends: data || []
      };
    } catch (error) {
      console.error('Error getting coupon email stats:', error);
      return {
        total_sent: 0,
        unique_recipients: 0,
        recent_sends: []
      };
    }
  }

  // Send coupon email
  static async sendTestCouponEmail(testEmail: string, couponCode: string = 'TEST20'): Promise<boolean> {
    try {
      const testData: CouponEmailData = {
        email: testEmail,
        name: 'Test User',
        couponCode: couponCode,
        marketingToolId: 'test-tool-id',
        marketingToolTitle: 'Test Marketing Tool'
      };

      return await this.sendCouponCodeEmail(testData);
    } catch (error) {
      console.error('Error sending test coupon email:', error);
      return false;
    }
  }

  // Simple test email method that bypasses database
  static async sendSimpleTestEmail(testEmail: string, couponCode: string = 'TEST20'): Promise<boolean> {
    try {
      console.log('Sending simple test email to:', testEmail);
      
      const subject = `Your Test Coupon Code - ${couponCode}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">🎉 Test Coupon Code</h1>
          <p>Dear Test User,</p>
          <p>This is a test email for the coupon functionality.</p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
            <h2 style="color: white; font-size: 36px; margin: 0; letter-spacing: 3px;">${couponCode}</h2>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Use this code at checkout</p>
          </div>
          <p>Best regards,<br>EZ Kiosk Ads Team</p>
        </div>
      `;
      const textBody = `Test Coupon Code: ${couponCode}\n\nBest regards,\nEZ Kiosk Ads Team`;

      if (GmailService.isConfigured()) {
        console.log('Gmail configured, sending directly...');
        await GmailService.sendEmail(testEmail, subject, htmlBody, textBody);
        console.log('Test email sent successfully via Gmail');
        return true;
      } else {
        console.log('Gmail not configured, queuing test email...');
        await supabase
          .from('email_queue')
          .insert({
            recipient_email: testEmail,
            recipient_name: 'Test User',
            subject,
            body_html: htmlBody,
            body_text: textBody,
            status: 'pending',
            retry_count: 0,
            max_retries: 3
          });
        console.log('Test email queued successfully');
        
        // Try to trigger the queue processor
        try {
          console.log('Attempting to trigger email queue processor...');
          const { data: result, error: invokeError } = await supabase.functions.invoke('email-queue-processor');
          if (invokeError) {
            console.log('Email queue processor error:', invokeError);
          } else {
            console.log('Email queue processor result:', result);
          }
        } catch (e) {
          console.log('Could not trigger email queue processor:', e);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error sending simple test email:', error);
      return false;
    }
  }

  // Manual trigger for email queue processor
  static async triggerEmailQueueProcessor(): Promise<boolean> {
    try {
      console.log('Manually triggering email queue processor...');
      const { data, error } = await supabase.functions.invoke('email-queue-processor');
      
      if (error) {
        console.error('Error triggering email queue processor:', error);
        return false;
      }
      
      console.log('Email queue processor triggered successfully:', data);
      return true;
    } catch (error) {
      console.error('Error triggering email queue processor:', error);
      return false;
    }
  }
}
