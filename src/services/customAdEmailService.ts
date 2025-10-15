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
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const clientName = order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`;
      const variables = {
        order_id: order.id,
        client_name: clientName,
        service_name: service.name,
        total_amount: (order.total_amount || 0).toFixed(2),
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, clientName, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_submitted', 'Custom Ad Order Submitted', 
        `New custom ad order #${order.id} has been submitted by ${clientName}`);

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
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        total_amount: (order.total_amount || 0).toFixed(2),
        rejection_reason: order.rejection_reason || 'No reason provided'
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

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
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const variables = {
        order_id: order.id,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        total_amount: (order.total_amount || 0).toFixed(2),
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

      // Send to admins with campaign creation instructions
      await this.sendAdminApprovalNotification(order, client, service);

    } catch (error) {
      console.error('Error sending order approved notification:', error);
    }
  }

  // Send email notification for designer assigned
  static async sendDesignerAssignedNotification(order: CustomAdOrder): Promise<void> {
    try {
      console.log('🎯 Starting designer assignment notification for order:', order.id);
      
      const template = await this.getEmailTemplate('custom_ad_designer_assigned');
      if (!template) {
        console.error('❌ Email template not found for custom_ad_designer_assigned');
        return;
      }
      console.log('✅ Email template found:', template.name);

      const client = await this.getUserProfile(order.user_id);
      if (!client) {
        console.error('❌ Client profile not found for user_id:', order.user_id);
        return;
      }
      console.log('✅ Client profile found:', client.email);

      const designer = await this.getUserProfile(order.assigned_designer_id!);
      if (!designer) {
        console.error('❌ Designer profile not found for assigned_designer_id:', order.assigned_designer_id);
        return;
      }
      console.log('✅ Designer profile found:', designer.email);

      const service = await this.getCustomAdService(order.service_key);
      if (!service) {
        console.error('❌ Service not found for service_key:', order.service_key);
        console.log('🔄 Using fallback service information...');
        // Use fallback service information
        const fallbackService = {
          name: order.service_key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Custom ad service'
        };
        console.log('✅ Using fallback service:', fallbackService.name);
        // Continue with fallback service
      } else {
        console.log('✅ Service found:', service.name);
      }

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const variables = {
        order_id: order.id,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        designer_email: designer.email,
        service_name: service?.name || order.service_key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        estimated_completion: estimatedCompletion
      };

      console.log('📧 Sending email to client:', client.email);
      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);
      console.log('✅ Email sent to client successfully');

      console.log('📧 Sending email to designer:', designer.email);
      // Send to designer
      await this.sendDesignerAssignmentNotification(order, designer);
      console.log('✅ Email sent to designer successfully');

      console.log('🎉 All designer assignment notifications sent successfully');

    } catch (error) {
      console.error('❌ Error sending designer assigned notification:', error);
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
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString()
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

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
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString()
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

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
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        proof_version: proof.version_number.toString(),
        client_feedback: proof.client_feedback || 'No specific feedback provided'
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

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
        ? new Date(order.actual_completion_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const variables = {
        order_id: order.id,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name,
        completion_date: completionDate
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

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
  private static async sendDesignerAssignmentNotification(order: CustomAdOrder, designer: { email: string; full_name: string; first_name: string; last_name: string }): Promise<void> {
    try {
      console.log('🎨 Starting designer assignment notification for designer:', designer.email);
      
      const template = await this.getEmailTemplate('custom_ad_designer_assignment');
      if (!template) {
        console.error('❌ Email template not found for custom_ad_designer_assignment');
        return;
      }
      console.log('✅ Designer assignment template found:', template.name);

      const service = await this.getCustomAdService(order.service_key);
      if (!service) {
        console.error('❌ Service not found for service_key:', order.service_key);
        console.log('🔄 Using fallback service information for designer notification...');
        // Use fallback service information
        const fallbackService = {
          name: order.service_key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Custom ad service'
        };
        console.log('✅ Using fallback service for designer:', fallbackService.name);
        // Continue with fallback service
      } else {
        console.log('✅ Service found for designer notification:', service.name);
      }

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const clientDetails = `${order.first_name} ${order.last_name} (${order.email}) - ${order.details}`;

      const variables = {
        order_id: order.id,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service?.name || order.service_key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        estimated_completion: estimatedCompletion,
        client_details: clientDetails,
        priority: order.priority
      };

      console.log('📧 Sending designer assignment email to:', designer.email);
      await this.sendEmail(template, designer.email, designer.full_name || `${designer.first_name} ${designer.last_name}`, variables);
      console.log('✅ Designer assignment email sent successfully');

    } catch (error) {
      console.error('❌ Error sending designer assignment notification:', error);
    }
  }

  // Send designer rejection notification
  private static async sendDesignerRejectionNotification(order: CustomAdOrder, proof: CustomAdProof, designer: { email: string; full_name: string; first_name: string; last_name: string }): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_designer_rejection');
      if (!template) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        designer_name: designer.full_name || `${designer.first_name} ${designer.last_name}`,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
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

  // Send admin approval notification with campaign creation instructions
  private static async sendAdminApprovalNotification(order: CustomAdOrder, client: { email: string; full_name: string; first_name: string; last_name: string }, service: { name: string }): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_admin_approval');
      if (!template) {
        // Create a default admin approval template if it doesn't exist
        await this.createDefaultAdminApprovalTemplate();
        return this.sendAdminApprovalNotification(order, client, service);
      }

      const admins = await this.getAdminUsers();
      if (admins.length === 0) return;

      const clientName = order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`;
      const variables = {
        order_id: order.id,
        client_name: clientName,
        client_email: client.email,
        service_name: service.name,
        total_amount: (order.total_amount || 0).toFixed(2),
        estimated_completion: order.estimated_completion_date 
          ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
          : 'TBD'
      };

      // Send to all admins
      for (const admin of admins) {
        await this.sendEmail(template, admin.email, admin.full_name, variables);
      }

      console.log(`Admin approval notification sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error('Error sending admin approval notification:', error);
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

  // Send designer message notification when client/host sends a message
  static async sendDesignerMessageNotification(orderId: string, message: string, senderName: string, senderRole: 'client' | 'host'): Promise<void> {
    try {
      console.log('📧 Starting designer message notification process...');
      console.log('📧 Order ID:', orderId);
      console.log('📧 Sender:', senderName, '(' + senderRole + ')');
      console.log('📧 Message:', message.substring(0, 50) + '...');

      // Get order details with designer information
      const { data: order, error: orderError } = await supabase
        .from('custom_ad_orders')
        .select(`
          id,
          workflow_status,
          assigned_designer_id,
          designer:profiles!custom_ad_orders_assigned_designer_id_fkey(id, full_name, email)
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('❌ Error fetching order:', orderError);
        return;
      }

      console.log('📧 Order found:', {
        id: order.id,
        workflow_status: order.workflow_status,
        assigned_designer_id: order.assigned_designer_id,
        designer_email: order.designer?.email
      });

      // Only send notification if order has a designer assigned and is in designer_assigned status
      if (!order.assigned_designer_id || order.workflow_status !== 'designer_assigned') {
        console.log('⚠️ Skipping email - Order not in designer_assigned status or no designer assigned');
        console.log('⚠️ Status:', order.workflow_status, 'Designer ID:', order.assigned_designer_id);
        return;
      }

      if (!order.designer?.email) {
        console.error('❌ Designer email not found for order:', orderId);
        return;
      }

      console.log('📧 Designer found:', order.designer.full_name, '(' + order.designer.email + ')');

      const subject = `New Message from ${senderRole === 'client' ? 'Client' : 'Host'} - Order #${orderId}`;
      const designerName = order.designer.full_name || 'Designer';
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">New Message from ${senderRole === 'client' ? 'Client' : 'Host'}</h2>
          <p>Hello ${designerName},</p>
          <p>You have received a new message from <strong>${senderName}</strong> regarding your assigned order <strong>#${orderId}</strong>.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${message}"</p>
          </div>
          
          <p>Please log into your designer portal to view the full conversation and respond to the client.</p>
          
          <div style="margin: 20px 0; text-align: center;">
            <a href="https://ezkioskads.com/designer/orders/${orderId}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Order Details
            </a>
          </div>
          
          <p>Best regards,<br>EZ Kiosk Ads Team</p>
        </div>
      `;

      // Initialize Gmail service first
      await GmailService.initialize();
      
      // Check if Gmail is configured
      if (!GmailService.isConfigured()) {
        console.log('⚠️ Gmail not configured on frontend, using email queue processor');
        await this.queueDesignerMessageEmail(order.designer.email, subject, htmlBody);
        
        // Trigger email queue processor to send immediately via edge function
        try {
          const { supabase } = await import('../lib/supabaseClient');
          console.log('📧 Triggering email queue processor...');
          const { data, error } = await supabase.functions.invoke('email-queue-processor');
          
          if (error) {
            console.error('❌ Email queue processor error:', error);
          } else {
            console.log('✅ Email queue processor triggered successfully:', data);
          }
        } catch (error) {
          console.error('❌ Could not trigger email queue processor:', error);
        }
        return;
      }

      // If Gmail is configured, send directly
      try {
        await GmailService.sendEmail(order.designer.email, subject, htmlBody);
        console.log('✅ Designer message notification sent successfully via Gmail');
      } catch (error) {
        console.error('❌ Gmail send failed, falling back to queue:', error);
        await this.queueDesignerMessageEmail(order.designer.email, subject, htmlBody);
        
        // Try to trigger queue processor as fallback
        try {
          const { supabase } = await import('../lib/supabaseClient');
          await supabase.functions.invoke('email-queue-processor');
          console.log('📧 Fallback: Email queue processor triggered');
        } catch (queueError) {
          console.error('❌ Could not trigger fallback email queue processor:', queueError);
        }
      }
    } catch (error) {
      console.error('Error sending designer message notification:', error);
    }
  }

  // Queue designer message email for later sending
  private static async queueDesignerMessageEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      
      const { error } = await supabase
        .from('email_queue')
        .insert({
          recipient_email: to,
          subject: subject,
          body_html: htmlBody,
          body_text: this.stripHtml(htmlBody),
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error queuing designer message email:', error);
      } else {
        console.log('📬 Designer message email queued for later sending');
      }
    } catch (error) {
      console.error('Error queuing designer message email:', error);
    }
  }

  // Strip HTML tags to create plain text version
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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
  private static async getUserProfile(userId: string): Promise<{ email: string; full_name: string; first_name: string; last_name: string; user?: { full_name: string } } | null> {
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
  private static async getCustomAdService(serviceKey: string): Promise<{ name: string } | null> {
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
  private static async getAdminUsers(): Promise<{ id: string; email: string; full_name: string }[]> {
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
      console.log('📧 Attempting to send email to:', to);
      console.log('📧 Gmail configured:', GmailService.isConfigured());
      
      if (!GmailService.isConfigured()) {
        console.log('⚠️ Gmail not configured, queuing email for later sending');
        // Queue email for later sending
        await this.queueEmail(template, to, toName, variables);
        return;
      }

      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.body_html, variables);
      const textBody = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

      console.log('📧 Sending email with subject:', subject);
      await GmailService.sendEmail(to, subject, htmlBody, textBody);
      console.log('✅ Email sent successfully via Gmail');
    } catch (error) {
      console.error('❌ Error sending email:', error);
      console.log('🔄 Queuing email for retry...');
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
          try { await supabase.functions.invoke('email-queue-processor'); } catch (error) {
            console.error('Error invoking email queue processor:', error);
          }
        }
      } catch (error) {
        console.error('Error processing email queue:', error);
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

  // Send email notification for custom ad order purchased/submitted (Client/Host)
  static async sendOrderPurchasedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_purchased');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const variables = {
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        order_id: order.id,
        service_name: service.name,
        total_amount: (order.total_amount || 0).toFixed(2),
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_purchased', 'Custom Ad Order Purchased', 
        `New custom ad order #${order.id} has been purchased by ${order.first_name} ${order.last_name}`);

    } catch (error) {
      console.error('Error sending order purchased notification:', error);
    }
  }

  // Send email notification for custom ad order approved to Designer (Admin Courtesy Copy)
  static async sendOrderApprovedToDesignerNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_approved');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = order.designer;
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const estimatedCompletion = order.estimated_completion_date 
        ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
        : 'TBD';

      const variables = {
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        order_id: order.id,
        service_name: service.name,
        designer_name: designer.full_name,
        estimated_completion: estimatedCompletion
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

      // Send to designer
      await this.sendDesignerNotification(designer.email, designer.full_name, 
        'Custom Ad Order Approved', `Order #${order.id} has been approved and assigned to you.`);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'order_approved', 'Custom Ad Order Approved', 
        `Custom ad order #${order.id} has been approved and assigned to designer ${designer.full_name}`);

    } catch (error) {
      console.error('Error sending order approved to designer notification:', error);
    }
  }

  // Send email notification for designer proof submitted (Admin Courtesy Copy)
  static async sendProofSubmittedNotification(order: CustomAdOrder, _proof: CustomAdProof): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_proof_submitted');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = order.designer;
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        order_id: order.id,
        service_name: service.name,
        designer_name: designer.full_name
      };

      // Send to client
      await this.sendEmail(template, client.email, client.user?.full_name || `${client.first_name} ${client.last_name}`, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'proof_submitted', 'Designer Proof Submitted', 
        `Designer ${designer.full_name} has submitted a proof for order #${order.id}`);

    } catch (error) {
      console.error('Error sending proof submitted notification:', error);
    }
  }

  // Send email notification for revision requested (change request)
  static async sendRevisionRequestedNotification(order: CustomAdOrder): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_revision_requested');
      if (!template) return;

      const client = await this.getUserProfile(order.user_id);
      if (!client) return;

      const designer = order.designer;
      if (!designer) return;

      const service = await this.getCustomAdService(order.service_key);
      if (!service) return;

      const variables = {
        order_id: order.id,
        client_name: order.user?.full_name || order.user?.full_name || `${order.first_name} ${order.last_name}`,
        service_name: service.name,
        designer_name: designer.full_name,
        client_feedback: order.client_notes || 'No specific feedback provided'
      };

      // Send to designer
      await this.sendEmail(template, designer.email, designer.full_name, variables);

      // Send to admins
      await this.sendNotificationToAdmins(order, 'revision_requested', 'Revision Requested', 
        `Client has requested changes for order #${order.id}`);

    } catch (error) {
      console.error('Error sending revision requested notification:', error);
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

  // Create default admin approval template
  private static async createDefaultAdminApprovalTemplate(): Promise<void> {
    try {
      // Create a simple template without complex HTML to avoid any processing issues
      const template = {
        name: 'Custom Ad Admin Approval',
        type: 'custom_ad_admin_approval',
        subject: 'Custom Ad Approved - Client Ready for Campaign Creation',
        body_html: '<h2>Custom Ad Approved</h2><p>Order ID: {{order_id}}</p><p>Client: {{client_name}}</p><p>Total Amount: ${{total_amount}}</p>',
        body_text: 'Custom Ad Approved - Order ID: {{order_id}} - Client: {{client_name}} - Total Amount: ${{total_amount}}',
        variables: ["order_id", "client_name", "total_amount"],
        is_active: true
      };

      const { error } = await supabase
        .from('email_templates')
        .insert(template);

      if (error) {
        console.error('Error creating admin approval template:', error);
      } else {
        console.log('Admin approval template created successfully');
      }
    } catch (error) {
      console.error('Error creating default admin approval template:', error);
    }
  }
}
