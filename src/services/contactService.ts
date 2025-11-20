import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

export interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  budget?: string;
  interest: string;
  message: string;
}

export class ContactService {
  /**
   * Send contact form submission to all admins
   */
  static async sendContactFormToAdmins(formData: ContactFormData): Promise<void> {
    try {
      // Get all admin emails
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin');

      if (adminError) {
        console.error('Error fetching admin emails:', adminError);
        throw new Error('Failed to fetch admin emails');
      }

      if (!admins || admins.length === 0) {
        console.warn('No admin emails found for contact form notification');
        // Still return success to not block the user, but log the issue
        return;
      }

      // Prepare email content
      const subject = `New Contact Form Submission - ${formData.interest}`;
      const htmlBody = this.createContactEmailHtml(formData);
      const textBody = this.createContactEmailText(formData);

      // Initialize Gmail service and check if configured for immediate sending
      await GmailService.initialize();
      const isGmailConfigured = GmailService.isConfigured();
      let sentCount = 0;
      let failedCount = 0;

      // Send emails immediately if Gmail is configured, otherwise queue them
      const emailQueue = await Promise.all(
        admins.map(async (admin) => {
          let status: 'pending' | 'sent' | 'failed' = 'pending';
          let sentAt: string | undefined = undefined;
          let errorMessage: string | undefined = undefined;

          // Try to send immediately if Gmail is configured
          if (isGmailConfigured) {
            try {
              await GmailService.sendEmail(
                admin.email,
                subject,
                htmlBody,
                textBody,
                'EZ Kiosk Ads'
              );
              status = 'sent';
              sentAt = new Date().toISOString();
              sentCount++;
              console.log(`✅ Contact form email sent immediately to ${admin.email}`);
            } catch (error) {
              // If immediate send fails, queue it for retry
              status = 'pending';
              errorMessage = error instanceof Error ? error.message : 'Unknown error';
              failedCount++;
              console.warn(`⚠️ Failed to send email immediately to ${admin.email}, queuing for retry:`, error);
            }
          }

          return {
            recipient_email: admin.email,
            recipient_name: admin.full_name || 'Admin',
            subject,
            body_html: htmlBody,
            body_text: textBody,
            status,
            sent_at: sentAt,
            error_message: errorMessage,
            retry_count: status === 'failed' ? 1 : 0,
            max_retries: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        })
      );

      // Insert emails into queue (for record-keeping and retry if needed)
      const { error: queueError } = await supabase
        .from('email_queue')
        .insert(emailQueue);

      if (queueError) {
        console.error('Error queueing contact form emails:', queueError);
        // Don't throw if we already sent some emails successfully
        if (sentCount === 0) {
          throw new Error('Failed to queue contact form emails');
        }
      }

      // If Gmail is not configured, try to invoke the email queue processor
      if (!isGmailConfigured) {
        try {
          await supabase.functions.invoke('email-queue-processor');
          console.log('📧 Email queue processor invoked');
        } catch (invokeError) {
          console.warn('Could not invoke email queue processor:', invokeError);
          // Don't throw - emails are queued and will be processed later
        }
      }

      if (isGmailConfigured) {
        console.log(`📧 Contact form submission: ${sentCount} sent immediately, ${failedCount} queued for retry`);
      } else {
        console.log(`📧 Contact form submission queued for ${admins.length} admin(s):`, admins.map(a => a.email));
      }
    } catch (error) {
      console.error('Error sending contact form to admins:', error);
      throw error;
    }
  }

  /**
   * Create HTML email body for contact form submission
   */
  private static createContactEmailHtml(formData: ContactFormData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #374151; margin-bottom: 5px; display: block; }
          .value { color: #6b7280; }
          .message-box { background-color: white; padding: 15px; border-left: 4px solid #4f46e5; margin-top: 10px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${this.escapeHtml(formData.name)}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value"><a href="mailto:${this.escapeHtml(formData.email)}">${this.escapeHtml(formData.email)}</a></span>
            </div>
            ${formData.company ? `
            <div class="field">
              <span class="label">Company:</span>
              <span class="value">${this.escapeHtml(formData.company)}</span>
            </div>
            ` : ''}
            ${formData.budget ? `
            <div class="field">
              <span class="label">Budget:</span>
              <span class="value">${this.escapeHtml(formData.budget)}</span>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Interest:</span>
              <span class="value">${this.escapeHtml(formData.interest)}</span>
            </div>
            <div class="field">
              <span class="label">Message:</span>
              <div class="message-box">
                ${this.escapeHtml(formData.message).replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="footer">
              <p>This email was sent from the contact form on EZ Kiosk Ads website.</p>
              <p>Submitted at: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create plain text email body for contact form submission
   */
  private static createContactEmailText(formData: ContactFormData): string {
    let text = `New Contact Form Submission\n\n`;
    text += `Name: ${formData.name}\n`;
    text += `Email: ${formData.email}\n`;
    if (formData.company) {
      text += `Company: ${formData.company}\n`;
    }
    if (formData.budget) {
      text += `Budget: ${formData.budget}\n`;
    }
    text += `Interest: ${formData.interest}\n\n`;
    text += `Message:\n${formData.message}\n\n`;
    text += `---\n`;
    text += `This email was sent from the contact form on EZ Kiosk Ads website.\n`;
    text += `Submitted at: ${new Date().toLocaleString()}\n`;
    return text;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private static escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

