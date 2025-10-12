import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

export interface AdminNotificationData {
  type: 'campaign_created' | 'custom_ad_purchased';
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: 'client' | 'host';
  campaign_id?: string;
  campaign_name?: string;
  order_id?: string;
  service_name?: string;
  total_amount?: number;
  created_at: string;
}

export class AdminNotificationService {
  // Send admin notification for campaign creation
  static async sendCampaignCreatedNotification(data: AdminNotificationData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('campaign_purchased');
      if (!template) {
        // Create default template if it doesn't exist
        try {
          await this.createDefaultCampaignTemplate();
          return this.sendCampaignCreatedNotification(data);
        } catch (templateError) {
          console.warn('Failed to create default email template, skipping admin notification:', templateError);
          return; // Skip notification if template creation fails
        }
      }

      const admins = await this.getAdminUsers();
      if (admins.length === 0) return;

      const variables = {
        user_name: data.user_name,
        user_email: data.user_email,
        user_role: data.user_role,
        campaign_name: data.campaign_name || 'Unknown Campaign',
        campaign_id: data.campaign_id || 'Unknown',
        created_at: new Date(data.created_at).toLocaleString()
      };

      // Send to all admins
      for (const admin of admins) {
        await this.sendEmail(template, admin.email, admin.full_name, variables);
      }

      console.log(`Campaign creation notification sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error('Error sending campaign creation notification:', error);
    }
  }

  // Send admin notification for custom ad purchase
  static async sendCustomAdPurchasedNotification(data: AdminNotificationData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_purchased');
      if (!template) {
        // Create default template if it doesn't exist
        try {
          await this.createDefaultCustomAdTemplate();
          return this.sendCustomAdPurchasedNotification(data);
        } catch (templateError) {
          console.warn('Failed to create default email template, skipping admin notification:', templateError);
          return; // Skip notification if template creation fails
        }
      }

      const admins = await this.getAdminUsers();
      if (admins.length === 0) return;

      const variables = {
        user_name: data.user_name,
        user_email: data.user_email,
        user_role: data.user_role,
        order_id: data.order_id || 'Unknown',
        service_name: data.service_name || 'Unknown Service',
        total_amount: data.total_amount?.toFixed(2) || '0.00',
        created_at: new Date(data.created_at).toLocaleString()
      };

      // Send to all admins
      for (const admin of admins) {
        await this.sendEmail(template, admin.email, admin.full_name, variables);
      }

      console.log(`Custom ad purchase notification sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error('Error sending custom ad purchase notification:', error);
    }
  }

  // Get admin users
  private static async getAdminUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  // Get email template by type
  private static async getEmailTemplate(type: string): Promise<any> {
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

  // Create default campaign template
  private static async createDefaultCampaignTemplate(): Promise<void> {
    try {
      const { data: newTemplate, error: createError } = await supabase
        .from('email_templates')
        .insert({
          name: 'Admin Campaign Created Notification',
          type: 'campaign_purchased',
          subject: 'New Campaign Created - {{campaign_name}}',
          body_html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>New Campaign Created</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #007bff;">New Campaign Created</h2>
                <p>A {{user_role}} has created a new campaign that requires your attention.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Campaign Details</h3>
                  <p><strong>Campaign Name:</strong> {{campaign_name}}</p>
                  <p><strong>Campaign ID:</strong> {{campaign_id}}</p>
                  <p><strong>Created By:</strong> {{user_name}} ({{user_email}})</p>
                  <p><strong>User Role:</strong> {{user_role}}</p>
                  <p><strong>Created:</strong> {{created_at}}</p>
                </div>
                
                <p>Please review this campaign in the Admin Portal.</p>
                
                <p>Best regards,<br>Ad Management System</p>
              </div>
            </body>
            </html>
          `,
          body_text: `New Campaign Created

Campaign Details:
- Campaign Name: {{campaign_name}}
- Campaign ID: {{campaign_id}}
- Created By: {{user_name}} ({{user_email}})
- User Role: {{user_role}}
- Created: {{created_at}}

Please review this campaign in the Admin Portal.

Best regards,
Ad Management System`,
          variables: '["user_name", "user_email", "user_role", "campaign_name", "campaign_id", "created_at"]',
          is_active: true
        })
        .select()
        .single();

      if (createError || !newTemplate) {
        throw new Error('Failed to create admin campaign notification template');
      }
    } catch (error) {
      console.error('Error creating default campaign template:', error);
    }
  }

  // Create default custom ad template
  private static async createDefaultCustomAdTemplate(): Promise<void> {
    try {
      const { data: newTemplate, error: createError } = await supabase
        .from('email_templates')
        .insert({
          name: 'Admin Custom Ad Purchased Notification',
          type: 'custom_ad_purchased',
          subject: 'New Custom Ad Order - {{service_name}}',
          body_html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>New Custom Ad Order</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #007bff;">New Custom Ad Order</h2>
                <p>A {{user_role}} has purchased a custom ad service that requires your attention.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Order Details</h3>
                  <p><strong>Order ID:</strong> {{order_id}}</p>
                  <p><strong>Service:</strong> {{service_name}}</p>
                  <p><strong>Total Amount:</strong> ${{total_amount}}</p>
                  <p><strong>Purchased By:</strong> {{user_name}} ({{user_email}})</p>
                  <p><strong>User Role:</strong> {{user_role}}</p>
                  <p><strong>Created:</strong> {{created_at}}</p>
                </div>
                
                <p>Please review this order in the Admin Portal.</p>
                
                <p>Best regards,<br>Ad Management System</p>
              </div>
            </body>
            </html>
          `,
          body_text: `New Custom Ad Order

Order Details:
- Order ID: {{order_id}}
- Service: {{service_name}}
- Total Amount: ${{total_amount}}
- Purchased By: {{user_name}} ({{user_email}})
- User Role: {{user_role}}
- Created: {{created_at}}

Please review this order in the Admin Portal.

Best regards,
Ad Management System`,
          variables: '["user_name", "user_email", "user_role", "order_id", "service_name", "total_amount", "created_at"]',
          is_active: true
        })
        .select()
        .single();

      if (createError || !newTemplate) {
        throw new Error('Failed to create admin custom ad notification template');
      }
    } catch (error) {
      console.error('Error creating default custom ad template:', error);
    }
  }

  // Send email using template
  private static async sendEmail(template: any, to: string, toName: string, variables: Record<string, string>): Promise<void> {
    try {
      if (!GmailService.isConfigured()) {
        // Queue email for later sending
        await this.queueEmail(template, to, toName, variables);
        return;
      }

      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.body_html, variables);
      const textBody = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

      await GmailService.sendEmail(to, subject, htmlBody, textBody);
    } catch (error) {
      console.error('Error sending email:', error);
      // Queue email for retry
      await this.queueEmail(template, to, toName, variables);
    }
  }

  // Queue email for later sending
  private static async queueEmail(template: any, to: string, toName: string, variables: Record<string, string>): Promise<void> {
    try {
      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.body_html, variables);
      const textBody = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

      await supabase
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

      // Trigger email processor
      try { await supabase.functions.invoke('email-queue-processor'); } catch (_) {}
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
}
