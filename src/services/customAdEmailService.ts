import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';
import type { CustomAdOrder, CustomAdProof } from './customAdsService';

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  is_active: boolean;
}

export interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'designer' | 'admin' | 'host';
}

export class CustomAdEmailService {
  // Send email notification for custom ad order submitted
  static async sendOrderSubmittedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_submitted');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toLocaleDateString()
        : 'TBD';

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        total_amount: order.total_amount.toFixed(2),
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_submitted', 'Custom Ad Order Submitted', 
        `New custom ad order #${order.id} has been submitted by ${order.first_name} ${order.last_name}`);

    } catch (error) {
      console.error('Error sending order submitted notification:', error);
    }
  }

  // Send email notification for custom ad order rejected
  static async sendOrderRejectedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_rejected');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        total_amount: order.total_amount.toFixed(2),
        rejection_reason: order.rejection_reason || 'No reason provided'
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_rejected', 'Custom Ad Order Rejected', 
        `Custom ad order #${order.id} has been rejected`);

    } catch (error) {
      console.error('Error sending order rejected notification:', error);
    }
  }

  // Send email notification for custom ad order approved
  static async sendOrderApprovedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_approved');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toLocaleDateString()
        : 'TBD';

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        total_amount: order.total_amount.toFixed(2),
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_approved', 'Custom Ad Order Approved', 
        `Custom ad order #${order.id} has been approved`);

    } catch (error) {
      console.error('Error sending order approved notification:', error);
    }
  }

  // Send email notification for designer assigned
  static async sendDesignerAssignedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_designer_assigned');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = await this.getUserProfile(order.assigned_designer_id!);
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toLocaleDateString()
        : 'TBD';

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        designer_email: designer.email,
        service_name: service.name,
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to designer
      await this.sendDesignerAssignmentNotification(order, designer);

    } catch (error) {
      console.error('Error sending designer assigned notification:', error);
    }
  }

  // Send email notification for proofs ready
  static async sendProofsReadyNotification(order: CustomAdOrder, proof: CustomAdProof): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_proofs_ready');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = await this.getUserProfile(proof.designer_id);
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString()
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'proofs_ready', 'Design Proofs Ready', 
        `Design proofs are ready for order #${order.id}`);

    } catch (error) {
      console.error('Error sending proofs ready notification:', error);
    }
  }

  // Send email notification for proof approved
  static async sendProofApprovedNotification(order: CustomAdOrder, proof: CustomAdProof): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_proof_approved');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = await this.getUserProfile(proof.designer_id);
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString()
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to designer
      await this.sendDesignerNotification(designer.email, designer.full_name || `${designer.first_name} ${designer.last_name}`, 
        'Design Proof Approved', `Your design proof for order #${order.id} has been approved by the client.`);

    } catch (error) {
      console.error('Error sending proof approved notification:', error);
    }
  }

  // Send email notification for proof rejected
  static async sendProofRejectedNotification(order: CustomAdOrder, proof: CustomAdProof): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_proof_rejected');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = await this.getUserProfile(proof.designer_id);
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString(),
        client_feedback: proof.client_feedback || 'No specific feedback provided'
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to designer
      await this.sendDesignerRejectionNotification(order, proof, designer);

    } catch (error) {
      console.error('Error sending proof rejected notification:', error);
    }
  }

  // Send email notification for order completed
  static async sendOrderCompletedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_completed');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = order.designer;
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const completionDate = order.actual_completion_date 
        ? new Date(order.actual_completion_date).toLocaleDateString()
        : new Date().toLocaleDateString();

      const variables = {
        order_id: order.id,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name,
        completion_date: completionDate
      };

      // Send to client
      await this.sendEmail(template, client.email, `${client.first_name} ${client.last_name}`, variables);

      // Send to designer
      await this.sendDesignerNotification(designer.email, designer.full_name, 
        'Custom Ad Order Completed', `Order #${order.id} has been completed and delivered to the client.`);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_completed', 'Custom Ad Order Completed', 
        `Custom ad order #${order.id} has been completed`);

    } catch (error) {
      console.error('Error sending order completed notification:', error);
    }
  }

  // Send designer assignment notification
  private static async sendDesignerAssignmentNotification(order: CustomAdOrder, designer: any): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_designer_assignment');
      if (!template) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toLocaleDateString()
        : 'TBD';

      const clientDetails = `${order.first_name} ${order.last_name} (${order.email}) - ${order.details}`;

      const variables = {
        order_id: order.id,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        estimated_completion: estimatedCompletion,
        client_details: clientDetails,
        priority: order.priority
      };

      await this.sendEmail(template, designer.email, designer.full_name || `${designer.first_name} ${designer.last_name}`, variables);

    } catch (error) {
      console.error('Error sending designer assignment notification:', error);
    }
  }

  // Send designer rejection notification
  private static async sendDesignerRejectionNotification(order: CustomAdOrder, proof: CustomAdProof, designer: any): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_designer_rejection');
      if (!template) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        client_name: `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        proof_version: proof.version_number.toString(),
        client_feedback: proof.client_feedback || 'No specific feedback provided'
      };

      await this.sendEmail(template, designer.email, designer.full_name || `${designer.first_name} ${designer.last_name}`, variables);

    } catch (error) {
      console.error('Error sending designer rejection notification:', error);
    }
  }

  // Send notification to admins
  private static async sendNotificationToAdmins(order: CustomAdOrder, type: string, title: string, message: string): Promise<void> {
    try {
      const admins = await this.getAdminUsers();
      
      for (const admin of admins) {
        await this.createNotification(order.id, admin.id, type, title, message);
      }
    } catch (error) {
      console.error('Error sending admin notifications:', error);
    }
  }

  // Send designer notification
  private static async sendDesignerNotification(email: string, name: string, subject: string, message: string): Promise<void> {
    try {
      if (!GmailService.isConfigured()) return;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <p>Hello ${name},</p>
          <p>${message}</p>
          <p>Best regards,<br>EZ Kiosk Ads Team</p>
        </div>
      `;

      await GmailService.sendEmail(email, subject, htmlBody);
    } catch (error) {
      console.error('Error sending designer notification:', error);
    }
  }

  // Get email template by type
  private static async getEmailTemplate(type: string): Promise<EmailTemplate | null> {
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

  // Get user profile
  private static async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Get custom ad service
  private static async getCustomAdService(serviceKey: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('custom_ad_services')
        .select('*')
        .eq('service_key', serviceKey)
        .eq('is_active', true)
        .maybeSingle();

      if (error) return null;
      return data || null;
    } catch (error) {
      console.error('Error getting custom ad service:', error);
      return null;
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

  // Send email using template
  private static async sendEmail(template: EmailTemplate, to: string, toName: string, variables: Record<string, string>): Promise<void> {
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
  private static async queueEmail(template: EmailTemplate, to: string, toName: string, variables: Record<string, string>): Promise<void> {
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

      // Attempt immediate delivery if Gmail is configured
      try {
        if (GmailService.isConfigured()) {
          await GmailService.processEmailQueue();
        } else {
          try { await supabase.functions.invoke('email-queue-processor'); } catch (_) {}
        }
      } catch (_) {}
    } catch (error) {
      console.error('Error queuing email:', error);
    }
  }

  // Replace template variables
  private static replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // Create notification record
  private static async createNotification(orderId: string, recipientId: string, type: string, title: string, message: string): Promise<void> {
    try {
      await supabase
        .from('custom_ad_notifications')
        .insert({
          order_id: orderId,
          recipient_id: recipientId,
          notification_type: type,
          title,
          message,
          is_read: false,
          email_sent: false
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Send test email
  static async sendTestEmail(templateType: string, testEmail: string): Promise<boolean> {
    try {
      const template = await this.getEmailTemplate(templateType);
      if (!template) return false;

      const testVariables = {
        order_id: 'TEST-123',
        client_name: 'Test Client',
        service_name: 'Test Service',
        total_amount: '100.00',
        estimated_completion: '2024-01-15',
        designer_name: 'Test Designer',
        designer_email: 'designer@test.com',
        proof_version: '1',
        client_feedback: 'Test feedback',
        rejection_reason: 'Test rejection reason',
        completion_date: '2024-01-15',
        client_details: 'Test client details',
        priority: 'normal'
      };

      await this.sendEmail(template, testEmail, 'Test User', testVariables);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }
}
