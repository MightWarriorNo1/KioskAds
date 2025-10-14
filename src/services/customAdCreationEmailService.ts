import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

export interface CustomAdCreationEmailData {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  budget_range?: string;
  deadline?: string;
  special_requirements?: string;
  target_audience?: string;
  brand_guidelines?: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
  };
  designer?: {
    id: string;
    full_name: string;
    email: string;
  };
  admin?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export type CustomAdCreationEmailStatus = 
  | 'purchased' 
  | 'assigned' 
  | 'proof_submitted' 
  | 'approved' 
  | 'request_changes';

export interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class CustomAdCreationEmailService {
  // Send email notification for custom ad creation purchased
  static async sendPurchasedNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_creation_purchased');
      if (!template) {
        console.error('Email template not found for custom_ad_purchased');
        return;
      }

      // Send to admin
      const adminEmails = await this.getAdminEmails();
      for (const adminEmail of adminEmails) {
        const variables = this.prepareTemplateVariables(creationData, 'purchased', adminEmail);
        await this.sendEmail(template, adminEmail.email, adminEmail.name, variables);
      }

      // Send to client/host
      if (creationData.user?.email) {
        const clientRecipient = {
          email: creationData.user.email,
          name: creationData.user.full_name,
          full_name: creationData.user.full_name
        };
        const variables = this.prepareTemplateVariables(creationData, 'purchased', clientRecipient);
        await this.sendEmail(template, creationData.user.email, creationData.user.full_name, variables);
      }
    } catch (error) {
      console.error('Error sending purchased notification:', error);
    }
  }

  // Send email notification for custom ad creation assigned to designer
  static async sendAssignedNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      // Get the designer assignment template for designer notification
      const designerTemplate = await this.getEmailTemplate('custom_ad_designer_assignment');
      if (!designerTemplate) {
        console.error('Email template not found for custom_ad_designer_assignment');
        return;
      }

      // Get the client notification template
      const clientTemplate = await this.getEmailTemplate('custom_ad_designer_assigned');
      if (!clientTemplate) {
        console.error('Email template not found for custom_ad_designer_assigned');
        return;
      }

      // Send to designer
      if (creationData.designer?.email) {
        const designerRecipient = {
          email: creationData.designer.email,
          name: creationData.designer.full_name,
          full_name: creationData.designer.full_name
        };
        const designerVariables = this.prepareTemplateVariables(creationData, 'assigned', designerRecipient);
        await this.sendEmail(designerTemplate, creationData.designer.email, creationData.designer.full_name, designerVariables);
      }

      // Send to client/host who ordered the ad
      if (creationData.user?.email) {
        const clientRecipient = {
          email: creationData.user.email,
          name: creationData.user.full_name,
          full_name: creationData.user.full_name
        };
        const clientVariables = this.prepareTemplateVariables(creationData, 'assigned', clientRecipient);
        await this.sendEmail(clientTemplate, creationData.user.email, creationData.user.full_name, clientVariables);
      }

      // Send to admin
      const adminEmails = await this.getAdminEmails();
      for (const adminEmail of adminEmails) {
        const adminVariables = this.prepareTemplateVariables(creationData, 'assigned', adminEmail);
        await this.sendEmail(clientTemplate, adminEmail.email, adminEmail.name, adminVariables);
      }
    } catch (error) {
      console.error('Error sending assigned notification:', error);
    }
  }

  // Send email notification for proof submitted
  static async sendProofSubmittedNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_creation_proof_submitted');
      if (!template) {
        console.error('Email template not found for custom_ad_proof_submitted');
        return;
      }

      // Send to client/host
      if (creationData.user?.email) {
        const clientRecipient = {
          email: creationData.user.email,
          name: creationData.user.full_name,
          full_name: creationData.user.full_name
        };
        const variables = this.prepareTemplateVariables(creationData, 'proof_submitted', clientRecipient);
        await this.sendEmail(template, creationData.user.email, creationData.user.full_name, variables);
      }

      // Send to admin (copy)
      const adminEmails = await this.getAdminEmails();
      for (const adminEmail of adminEmails) {
        const variables = this.prepareTemplateVariables(creationData, 'proof_submitted', adminEmail);
        await this.sendEmail(template, adminEmail.email, adminEmail.name, variables);
      }
    } catch (error) {
      console.error('Error sending proof submitted notification:', error);
    }
  }

  // Send email notification for custom ad approved
  static async sendApprovedNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_creation_approved');
      if (!template) {
        console.error('Email template not found for custom_ad_approved');
        return;
      }

      // Send to client/host
      if (creationData.user?.email) {
        const clientRecipient = {
          email: creationData.user.email,
          name: creationData.user.full_name,
          full_name: creationData.user.full_name
        };
        const variables = this.prepareTemplateVariables(creationData, 'approved', clientRecipient);
        await this.sendEmail(template, creationData.user.email, creationData.user.full_name, variables);
      }

      // Send to designer
      if (creationData.designer?.email) {
        const designerRecipient = {
          email: creationData.designer.email,
          name: creationData.designer.full_name,
          full_name: creationData.designer.full_name
        };
        const variables = this.prepareTemplateVariables(creationData, 'approved', designerRecipient);
        await this.sendEmail(template, creationData.designer.email, creationData.designer.full_name, variables);
      }

      // Send to admin with campaign creation instructions
      await this.sendAdminApprovalNotification(creationData);
    } catch (error) {
      console.error('Error sending approved notification:', error);
    }
  }

  // Send email notification for request changes
  static async sendRequestChangesNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_creation_request_changes');
      if (!template) {
        console.error('Email template not found for custom_ad_request_changes');
        return;
      }

      // Send to designer
      if (creationData.designer?.email) {
        const designerRecipient = {
          email: creationData.designer.email,
          name: creationData.designer.full_name,
          full_name: creationData.designer.full_name
        };
        const variables = this.prepareTemplateVariables(creationData, 'request_changes', designerRecipient);
        await this.sendEmail(template, creationData.designer.email, creationData.designer.full_name, variables);
      }

      // Send to admin (copy)
      const adminEmails = await this.getAdminEmails();
      for (const adminEmail of adminEmails) {
        const variables = this.prepareTemplateVariables(creationData, 'request_changes', adminEmail);
        await this.sendEmail(template, adminEmail.email, adminEmail.name, variables);
      }
    } catch (error) {
      console.error('Error sending request changes notification:', error);
    }
  }

  // Get email template by type
  private static async getEmailTemplate(type: string): Promise<EmailTemplate | null> {
    try {
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching email template:', error);
        return null;
      }

      return template;
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  }

  // Get admin emails
  private static async getAdminEmails(): Promise<Array<{ email: string; name: string }>> {
    try {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching admin emails:', error);
        return [];
      }

      return admins?.map(admin => ({
        email: admin.email,
        name: admin.full_name || 'Admin'
      })) || [];
    } catch (error) {
      console.error('Error fetching admin emails:', error);
      return [];
    }
  }

  // Prepare template variables
  private static prepareTemplateVariables(
    creationData: CustomAdCreationEmailData,
    status: CustomAdCreationEmailStatus,
    recipient: { email: string; name: string; full_name?: string }
  ): Record<string, string> {
    const variables: Record<string, string> = {
      // Common variables
      recipient_name: recipient.full_name || recipient.name,
      recipient_email: recipient.email,
      creation_title: creationData.title,
      creation_description: creationData.description || 'No description provided',
      creation_category: creationData.category || 'Not specified',
      creation_priority: creationData.priority,
      creation_budget: creationData.budget_range || 'Not specified',
      creation_deadline: creationData.deadline || 'Not specified',
      creation_requirements: creationData.special_requirements || 'None',
      creation_audience: creationData.target_audience || 'Not specified',
      creation_guidelines: creationData.brand_guidelines || 'None',
      creation_id: creationData.id,
      creation_date: new Date(creationData.created_at).toLocaleDateString(),
      status: status,
      client_name: creationData.user?.full_name || 'Client',
      client_email: creationData.user?.email || '',
      designer_name: creationData.designer?.full_name || 'Designer',
      designer_email: creationData.designer?.email || '',
      company_name: creationData.user?.company_name || 'Your Company',
      
      // Template-specific variables for custom_ad_designer_assigned template
      order_id: creationData.id,
      service_name: creationData.category || 'Custom Ad Creation',
      estimated_completion: creationData.deadline || 'TBD',
      
      // Template-specific variables for custom_ad_designer_assignment template
      client_details: `${creationData.user?.full_name || 'Client'} (${creationData.user?.email || ''}) - ${creationData.description || 'No description provided'}`,
      priority: creationData.priority || 'Normal'
    };

    return variables;
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
          try { 
            await supabase.functions.invoke('email-queue-processor'); 
          } catch (error) {
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
    
    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || '');
    }
    
    // Remove any remaining placeholders
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    
    return result;
  }

  // Send admin approval notification with campaign creation instructions
  private static async sendAdminApprovalNotification(creationData: CustomAdCreationEmailData): Promise<void> {
    try {
      const template = await this.getEmailTemplate('custom_ad_creation_admin_approval');
      if (!template) {
        // Create a default admin approval template if it doesn't exist
        await this.createDefaultAdminApprovalTemplate();
        return this.sendAdminApprovalNotification(creationData);
      }

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) return;

      // Send to all admins
      for (const adminEmail of adminEmails) {
        const variables = this.prepareTemplateVariables(creationData, 'approved', adminEmail);
        await this.sendEmail(template, adminEmail.email, adminEmail.name, variables);
      }

      console.log(`Admin approval notification sent to ${adminEmails.length} admin(s)`);
    } catch (error) {
      console.error('Error sending admin approval notification:', error);
    }
  }

  // Create default admin approval template for custom ad creation
  private static async createDefaultAdminApprovalTemplate(): Promise<void> {
    try {
      const template = {
        type: 'custom_ad_creation_admin_approval',
        subject: 'Custom Ad Creation Approved - Client Ready for Campaign Creation',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              Custom Ad Creation Approved - Client Ready for Campaign Creation
            </h2>
            
            <p>Hello Admin,</p>
            
            <p>A custom ad creation has been approved by the client and is now ready for campaign creation.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-top: 0;">Creation Details</h3>
              <p><strong>Title:</strong> {{creation_title}}</p>
              <p><strong>Description:</strong> {{creation_description}}</p>
              <p><strong>Category:</strong> {{creation_category}}</p>
              <p><strong>Priority:</strong> {{creation_priority}}</p>
              <p><strong>Budget Range:</strong> {{creation_budget}}</p>
              <p><strong>Deadline:</strong> {{creation_deadline}}</p>
              <p><strong>Client:</strong> {{client_name}} ({{client_email}})</p>
              <p><strong>Designer:</strong> {{designer_name}}</p>
              <p><strong>Creation ID:</strong> {{creation_id}}</p>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">Next Steps for Client</h3>
              <p>The client has been notified that their custom ad is approved. They should now:</p>
              <ol style="color: #065f46;">
                <li>Go to the Create Campaign dashboard</li>
                <li>Choose "Select Custom Created Vertical Ad"</li>
                <li>Start their ad campaign today</li>
              </ol>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              This is an automated notification for admin awareness. The client has been provided with instructions to proceed with campaign creation.
            </p>
            
            <p>Best regards,<br>Ad Management Platform</p>
          </div>
        `,
        body_text: `
Custom Ad Creation Approved - Client Ready for Campaign Creation

Hello Admin,

A custom ad creation has been approved by the client and is now ready for campaign creation.

Creation Details:
- Title: {{creation_title}}
- Description: {{creation_description}}
- Category: {{creation_category}}
- Priority: {{creation_priority}}
- Budget Range: {{creation_budget}}
- Deadline: {{creation_deadline}}
- Client: {{client_name}} ({{client_email}})
- Designer: {{designer_name}}
- Creation ID: {{creation_id}}

Next Steps for Client:
The client has been notified that their custom ad is approved. They should now:
1. Go to the Create Campaign dashboard
2. Choose "Select Custom Created Vertical Ad"
3. Start their ad campaign today

This is an automated notification for admin awareness. The client has been provided with instructions to proceed with campaign creation.

Best regards,
Ad Management Platform
        `,
        is_active: true
      };

      const { error } = await supabase
        .from('email_templates')
        .insert(template);

      if (error) {
        console.error('Error creating custom ad creation admin approval template:', error);
      } else {
        console.log('Custom ad creation admin approval template created successfully');
      }
    } catch (error) {
      console.error('Error creating default custom ad creation admin approval template:', error);
    }
  }

  // Create default email templates for custom ad creation workflow
  static async createDefaultTemplates(): Promise<void> {
    try {
      const templates = [
        {
          type: 'custom_ad_creation_purchased',
          subject: 'New Custom Ad Creation Request - {{creation_title}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Custom Ad Creation Request</h2>
              <p>Hello {{recipient_name}},</p>
              <p>A new custom ad creation request has been submitted:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{creation_title}}</h3>
                <p><strong>Description:</strong> {{creation_description}}</p>
                <p><strong>Category:</strong> {{creation_category}}</p>
                <p><strong>Priority:</strong> {{creation_priority}}</p>
                <p><strong>Budget Range:</strong> {{creation_budget}}</p>
                <p><strong>Deadline:</strong> {{creation_deadline}}</p>
                <p><strong>Special Requirements:</strong> {{creation_requirements}}</p>
                <p><strong>Target Audience:</strong> {{creation_audience}}</p>
                <p><strong>Brand Guidelines:</strong> {{creation_guidelines}}</p>
              </div>
              <p><strong>Client:</strong> {{client_name}} ({{client_email}})</p>
              <p><strong>Request ID:</strong> {{creation_id}}</p>
              <p><strong>Submitted:</strong> {{creation_date}}</p>
              <p>Please review and assign a designer to this project.</p>
              <p>Best regards,<br>Ad Management Platform</p>
            </div>
          `,
          body_text: `
New Custom Ad Creation Request

Hello {{recipient_name}},

A new custom ad creation request has been submitted:

Title: {{creation_title}}
Description: {{creation_description}}
Category: {{creation_category}}
Priority: {{creation_priority}}
Budget Range: {{creation_budget}}
Deadline: {{creation_deadline}}
Special Requirements: {{creation_requirements}}
Target Audience: {{creation_audience}}
Brand Guidelines: {{creation_guidelines}}

Client: {{client_name}} ({{client_email}})
Request ID: {{creation_id}}
Submitted: {{creation_date}}

Please review and assign a designer to this project.

Best regards,
Ad Management Platform
          `
        },
        {
          type: 'custom_ad_creation_assigned',
          subject: 'Custom Ad Creation Assigned - {{creation_title}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Custom Ad Creation Assigned</h2>
              <p>Hello {{recipient_name}},</p>
              <p>You have been assigned to work on the following custom ad creation:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{creation_title}}</h3>
                <p><strong>Description:</strong> {{creation_description}}</p>
                <p><strong>Category:</strong> {{creation_category}}</p>
                <p><strong>Priority:</strong> {{creation_priority}}</p>
                <p><strong>Budget Range:</strong> {{creation_budget}}</p>
                <p><strong>Deadline:</strong> {{creation_deadline}}</p>
                <p><strong>Special Requirements:</strong> {{creation_requirements}}</p>
                <p><strong>Target Audience:</strong> {{creation_audience}}</p>
                <p><strong>Brand Guidelines:</strong> {{creation_guidelines}}</p>
              </div>
              <p><strong>Client:</strong> {{client_name}} ({{client_email}})</p>
              <p><strong>Request ID:</strong> {{creation_id}}</p>
              <p>Please begin working on this project and submit proofs when ready.</p>
              <p>Best regards,<br>Ad Management Platform</p>
            </div>
          `,
          body_text: `
Custom Ad Creation Assigned

Hello {{recipient_name}},

You have been assigned to work on the following custom ad creation:

Title: {{creation_title}}
Description: {{creation_description}}
Category: {{creation_category}}
Priority: {{creation_priority}}
Budget Range: {{creation_budget}}
Deadline: {{creation_deadline}}
Special Requirements: {{creation_requirements}}
Target Audience: {{creation_audience}}
Brand Guidelines: {{creation_guidelines}}

Client: {{client_name}} ({{client_email}})
Request ID: {{creation_id}}

Please begin working on this project and submit proofs when ready.

Best regards,
Ad Management Platform
          `
        },
        {
          type: 'custom_ad_creation_proof_submitted',
          subject: 'Design Proofs Ready for Review - {{creation_title}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Design Proofs Ready for Review</h2>
              <p>Hello {{recipient_name}},</p>
              <p>Design proofs are ready for your review for the following custom ad creation:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{creation_title}}</h3>
                <p><strong>Description:</strong> {{creation_description}}</p>
                <p><strong>Category:</strong> {{creation_category}}</p>
                <p><strong>Priority:</strong> {{creation_priority}}</p>
                <p><strong>Budget Range:</strong> {{creation_budget}}</p>
                <p><strong>Deadline:</strong> {{creation_deadline}}</p>
              </div>
              <p><strong>Request ID:</strong> {{creation_id}}</p>
              <p>Please review the proofs and provide your feedback. You can approve the designs or request changes.</p>
              <p>Best regards,<br>Ad Management Platform</p>
            </div>
          `,
          body_text: `
Design Proofs Ready for Review

Hello {{recipient_name}},

Design proofs are ready for your review for the following custom ad creation:

Title: {{creation_title}}
Description: {{creation_description}}
Category: {{creation_category}}
Priority: {{creation_priority}}
Budget Range: {{creation_budget}}
Deadline: {{creation_deadline}}

Request ID: {{creation_id}}

Please review the proofs and provide your feedback. You can approve the designs or request changes.

Best regards,
Ad Management Platform
          `
        },
        {
          type: 'custom_ad_creation_approved',
          subject: 'Custom Ad Creation Approved - {{creation_title}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Custom Ad Creation Approved</h2>
              <p>Hello {{recipient_name}},</p>
              <p>Great news! The following custom ad creation has been approved:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{creation_title}}</h3>
                <p><strong>Description:</strong> {{creation_description}}</p>
                <p><strong>Category:</strong> {{creation_category}}</p>
                <p><strong>Priority:</strong> {{creation_priority}}</p>
                <p><strong>Budget Range:</strong> {{creation_budget}}</p>
                <p><strong>Deadline:</strong> {{creation_deadline}}</p>
              </div>
              <p><strong>Request ID:</strong> {{creation_id}}</p>
              <p>The approved designs are now ready for use in your campaigns.</p>
              <p>Best regards,<br>Ad Management Platform</p>
            </div>
          `,
          body_text: `
Custom Ad Creation Approved

Hello {{recipient_name}},

Great news! The following custom ad creation has been approved:

Title: {{creation_title}}
Description: {{creation_description}}
Category: {{creation_category}}
Priority: {{creation_priority}}
Budget Range: {{creation_budget}}
Deadline: {{creation_deadline}}

Request ID: {{creation_id}}

The approved designs are now ready for use in your campaigns.

Best regards,
Ad Management Platform
          `
        },
        {
          type: 'custom_ad_creation_request_changes',
          subject: 'Changes Requested for Custom Ad Creation - {{creation_title}}',
          body_html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Changes Requested</h2>
              <p>Hello {{recipient_name}},</p>
              <p>Changes have been requested for the following custom ad creation:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{{creation_title}}</h3>
                <p><strong>Description:</strong> {{creation_description}}</p>
                <p><strong>Category:</strong> {{creation_category}}</p>
                <p><strong>Priority:</strong> {{creation_priority}}</p>
                <p><strong>Budget Range:</strong> {{creation_budget}}</p>
                <p><strong>Deadline:</strong> {{creation_deadline}}</p>
              </div>
              <p><strong>Request ID:</strong> {{creation_id}}</p>
              <p>Please review the feedback and make the necessary changes. Submit updated proofs when ready.</p>
              <p>Best regards,<br>Ad Management Platform</p>
            </div>
          `,
          body_text: `
Changes Requested

Hello {{recipient_name}},

Changes have been requested for the following custom ad creation:

Title: {{creation_title}}
Description: {{creation_description}}
Category: {{creation_category}}
Priority: {{creation_priority}}
Budget Range: {{creation_budget}}
Deadline: {{creation_deadline}}

Request ID: {{creation_id}}

Please review the feedback and make the necessary changes. Submit updated proofs when ready.

Best regards,
Ad Management Platform
          `
        }
      ];

      for (const template of templates) {
        const { error } = await supabase
          .from('email_templates')
          .upsert({
            type: template.type,
            subject: template.subject,
            body_html: template.body_html,
            body_text: template.body_text,
            is_active: true
          });

        if (error) {
          console.error(`Error creating template ${template.type}:`, error);
        }
      }
    } catch (error) {
      console.error('Error creating default custom ad creation templates:', error);
    }
  }
}
