import { supabase } from '../lib/supabaseClient';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export interface EmailQueueItem {
  id: string;
  template_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export class GmailService {
  private static config: GmailConfig | null = null;

  // Initialize Gmail configuration
  static async initialize(): Promise<void> {
    try {
      const { data: integration } = await supabase
        .from('system_integrations')
        .select('config')
        .eq('type', 'gmail')
        .eq('status', 'connected')
        .single();

      if (integration?.config) {
        this.config = integration.config as GmailConfig;
      }
    } catch (error) {
      console.error('Error initializing Gmail service:', error);
    }
  }

  // Check if Gmail is configured and connected
  static isConfigured(): boolean {
    return this.config !== null && !!this.config.refreshToken;
  }

  // Send email using Gmail API
  static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
    fromName: string = 'EZ Kiosk Ads'
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Gmail service is not configured');
    }

    try {
      // Ensure we have a valid access token
      await this.refreshAccessToken();

      const message = this.createEmailMessage(to, subject, htmlBody, textBody, fromName);
      
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gmail API error: ${error}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Process email queue
  static async processEmailQueue(): Promise<void> {
    try {
      const { data: pendingEmails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      for (const email of pendingEmails || []) {
        try {
          await this.sendEmail(
            email.recipient_email,
            email.subject,
            email.body_html,
            email.body_text
          );

          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);

        } catch (error) {
          // Mark as failed or increment retry count
          const newRetryCount = email.retry_count + 1;
          const status = newRetryCount >= email.max_retries ? 'failed' : 'pending';

          await supabase
            .from('email_queue')
            .update({
              status,
              retry_count: newRetryCount,
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);
        }
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  // Refresh access token
  private static async refreshAccessToken(): Promise<void> {
    if (!this.config?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      this.config.accessToken = data.access_token;
      this.config.tokenExpiry = Date.now() + (data.expires_in * 1000);

      // Update the stored config
      await supabase
        .from('system_integrations')
        .update({
          config: this.config,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('type', 'gmail')
        .eq('status', 'connected');

    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // Create email message in Gmail format
  private static createEmailMessage(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
    fromName: string = 'EZ Kiosk Ads'
  ): string {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    const fromEmail = 'noreply@ezkioskads.com'; // This should be configured

    let message = `From: ${fromName} <${fromEmail}>\r\n`;
    message += `To: ${to}\r\n`;
    message += `Subject: ${subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

    if (textBody) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${textBody}\r\n\r\n`;
    }

    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    message += `${htmlBody}\r\n\r\n`;
    message += `--${boundary}--\r\n`;

    return message;
  }

  // Test Gmail connection
  static async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      await this.refreshAccessToken();

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing Gmail connection:', error);
      return false;
    }
  }

  // Get Gmail profile info
  static async getProfile(): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gmail service is not configured');
      }

      await this.refreshAccessToken();

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get Gmail profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Gmail profile:', error);
      throw error;
    }
  }

  // Setup Gmail integration (OAuth flow)
  static async setupIntegration(authCode: string, redirectUri: string): Promise<void> {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
          client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '',
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();

      const config: GmailConfig = {
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '',
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiry: Date.now() + (tokens.expires_in * 1000),
      };

      // Store the configuration
      const { error } = await supabase
        .from('system_integrations')
        .upsert({
          name: 'Gmail API',
          type: 'gmail',
          status: 'connected',
          config,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      this.config = config;
    } catch (error) {
      console.error('Error setting up Gmail integration:', error);
      throw error;
    }
  }

  // Disconnect Gmail integration
  static async disconnect(): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_integrations')
        .update({
          status: 'disconnected',
          config: {},
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('type', 'gmail');

      if (error) throw error;

      this.config = null;
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      throw error;
    }
  }
}

// Initialize Gmail service on module load
GmailService.initialize();
