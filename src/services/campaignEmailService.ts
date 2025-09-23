import { supabase } from '../lib/supabaseClient';
import { GmailService } from './gmailService';

type CampaignEmailStatus = 'approved' | 'rejected' | 'active' | 'expiring' | 'expired' | 'paused' | 'resumed';

interface CampaignEmailData {
  campaign_id: string;
  campaign_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  total_spent?: number;
  impressions?: number;
  clicks?: number;
  target_locations?: string | null;
  rejection_reason?: string | null;
}

export class CampaignEmailService {
  static async sendCampaignStatusNotification(
    campaignData: CampaignEmailData,
    status: CampaignEmailStatus
  ): Promise<boolean> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', `campaign_${status}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError || !template) return false;

      const recipients = await this.getRecipients(campaignData, status);
      if (recipients.length === 0) return false;

      const variables = this.prepareTemplateVariables(campaignData, status);

      for (const recipient of recipients) {
        await this.enqueueEmail(template, variables, recipient.email, recipient.name);
      }

      // Trigger server-side processor to deliver immediately (avoid client-side Gmail auth)
      try { await supabase.functions.invoke('email-queue-processor'); } catch (_) {}

      return true;
    } catch (error) {
      console.error('Error in sendCampaignStatusNotification:', error);
      return false;
    }
  }

  static async sendTestEmail(status: CampaignEmailStatus, testEmail: string): Promise<boolean> {
    const dummy: CampaignEmailData = {
      campaign_id: 'TEST',
      campaign_name: 'Test Campaign',
      user_id: 'TEST',
      user_email: testEmail,
      user_name: 'Test User',
      user_role: 'client',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      budget: 1000,
      target_locations: 'Sample City',
      rejection_reason: 'Not applicable'
    };
    return this.sendCampaignStatusNotification(dummy, status);
  }

  private static async getRecipients(
    campaignData: CampaignEmailData,
    status: CampaignEmailStatus
  ): Promise<Array<{ email: string; name: string; role: string }>> {
    const recipients: Array<{ email: string; name: string; role: string }> = [];

    // Always include the campaign owner
    recipients.push({ email: campaignData.user_email, name: campaignData.user_name, role: campaignData.user_role });

    // Admin notifications for key events
    if (status === 'rejected' || status === 'expired') {
      const { data: admins } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin');
      (admins || []).forEach(a => recipients.push({ email: a.email, name: a.full_name, role: 'admin' }));
    }

    // Host notifications when relevant
    if (campaignData.user_role === 'client' && (status === 'approved' || status === 'active')) {
      const { data: hostKiosks } = await supabase
        .from('kiosk_campaigns')
        .select(`
          kiosks!inner(
            host_id,
            profiles!inner(email, full_name)
          )
        `)
        .eq('campaign_id', campaignData.campaign_id);
      (hostKiosks || []).forEach((kc: any) => {
        if (kc.kiosks?.profiles) {
          recipients.push({ email: kc.kiosks.profiles.email, name: kc.kiosks.profiles.full_name, role: 'host' });
        }
      });
    }

    return recipients;
  }

  private static prepareTemplateVariables(c: CampaignEmailData, status: CampaignEmailStatus): Record<string, any> {
    const variables: Record<string, any> = {
      campaign_name: c.campaign_name,
      budget: c.budget ?? 0,
      start_date: c.start_date ? new Date(c.start_date).toLocaleDateString() : '',
      end_date: c.end_date ? new Date(c.end_date).toLocaleDateString() : '',
      target_locations: c.target_locations || 'All Locations',
      rejection_reason: c.rejection_reason || 'N/A'
    };

    switch (status) {
      case 'approved':
      case 'active':
        variables.start_date = variables.start_date || new Date().toLocaleDateString();
        break;
      case 'expiring':
      case 'expired':
        variables.end_date = variables.end_date || new Date().toLocaleDateString();
        break;
    }
    return variables;
  }

  private static async enqueueEmail(
    template: any,
    variables: Record<string, any>,
    toEmail: string,
    toName: string
  ): Promise<void> {
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text as string | undefined;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, String(value));
      bodyHtml = bodyHtml.replace(placeholder, String(value));
      bodyText = bodyText?.replace(placeholder, String(value));
    });

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
}


