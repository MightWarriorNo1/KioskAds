import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

export interface SubscriptionEmailData {
  user_id: string;
  user_email: string;
  user_name: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  next_billing_date?: string;
  decline_reason?: string;
}

export class SubscriptionEmailService {
  // Send email notification for subscription payment declined
  static async sendPaymentDeclinedNotification(
    subscriptionData: SubscriptionEmailData
  ): Promise<boolean> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'subscription_payment_declined')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError || !template) return false;

      const recipients = await this.getRecipients(subscriptionData);
      if (recipients.length === 0) return false;

      const variables = this.prepareTemplateVariables(subscriptionData, 'declined');

      for (const recipient of recipients) {
        await this.enqueueEmail(template, variables, recipient.email, recipient.name);
      }

      // Trigger server-side processor to deliver immediately
      try { await supabase.functions.invoke('email-queue-processor'); } catch (_) {}

      return true;
    } catch (error) {
      console.error('Error in sendPaymentDeclinedNotification:', error);
      return false;
    }
  }

  // Send email notification for subscription payment success
  static async sendPaymentSuccessNotification(
    subscriptionData: SubscriptionEmailData
  ): Promise<boolean> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'subscription_payment_success')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError || !template) return false;

      const recipients = await this.getRecipients(subscriptionData);
      if (recipients.length === 0) return false;

      const variables = this.prepareTemplateVariables(subscriptionData, 'success');

      for (const recipient of recipients) {
        await this.enqueueEmail(template, variables, recipient.email, recipient.name);
      }

      // Trigger server-side processor to deliver immediately
      try { await supabase.functions.invoke('email-queue-processor'); } catch (_) {}

      return true;
    } catch (error) {
      console.error('Error in sendPaymentSuccessNotification:', error);
      return false;
    }
  }

  // Send test email
  static async sendTestEmail(type: 'declined' | 'success', testEmail: string): Promise<boolean> {
    const dummy: SubscriptionEmailData = {
      user_id: 'TEST',
      user_email: testEmail,
      user_name: 'Test User',
      subscription_id: 'TEST-SUB-123',
      amount: 29.99,
      payment_date: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      decline_reason: type === 'declined' ? 'Insufficient funds' : undefined
    };

    if (type === 'declined') {
      return this.sendPaymentDeclinedNotification(dummy);
    } else {
      return this.sendPaymentSuccessNotification(dummy);
    }
  }

  private static async getRecipients(
    subscriptionData: SubscriptionEmailData
  ): Promise<Array<{ email: string; name: string; role: string }>> {
    const recipients: Array<{ email: string; name: string; role: string }> = [];

    // Always include the subscription owner
    recipients.push({ 
      email: subscriptionData.user_email, 
      name: subscriptionData.user_name, 
      role: 'client' 
    });

    // Admin notifications for payment issues
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin');
    (admins || []).forEach(a => recipients.push({ 
      email: a.email, 
      name: a.full_name, 
      role: 'admin' 
    }));

    return recipients;
  }

  private static prepareTemplateVariables(
    data: SubscriptionEmailData, 
    type: 'declined' | 'success'
  ): Record<string, any> {
    const variables: Record<string, any> = {
      client_name: data.user_name,
      amount: data.amount.toFixed(2),
      payment_date: new Date(data.payment_date).toISOString().split('T')[0],
      subscription_id: data.subscription_id
    };

    if (type === 'declined') {
      variables.decline_reason = data.decline_reason || 'Payment processing failed';
    } else {
      variables.next_billing_date = data.next_billing_date 
        ? new Date(data.next_billing_date).toISOString().split('T')[0] 
        : 'N/A';
    }

    return variables;
  }

  private static async enqueueEmail(
    template: any,
    variables: Record<string, any>,
    toEmail: string,
    toName: string
  ): Promise<void> {
    let subject = this.replaceVariables(template.subject, variables);
    let bodyHtml = this.replaceVariables(template.body_html, variables);
    let bodyText = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined;

    await supabase.from('email_queue').insert({
      template_id: template.id,
      recipient_email: toEmail,
      recipient_name: toName,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      status: 'pending',
      retry_count: 0,
      max_retries: 3
    });
  }

  // Replace template variables and remove any remaining placeholders
  private static replaceVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    
    // First, replace all known variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const replacement = value !== null && value !== undefined ? String(value) : '';
      result = result.replace(placeholder, replacement);
    });
    
    // Then, remove any remaining placeholders that weren't replaced
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    
    return result;
  }
}
