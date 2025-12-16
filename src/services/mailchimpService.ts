import { supabase } from '../lib/supabaseClient';

export interface MailchimpSubscribeParams {
  email: string;
  first_name?: string;
  last_name?: string;
  tags?: string[];
  role?: 'client' | 'host' | 'designer' | 'admin';
}

export class MailchimpService {
  static async subscribe(params: MailchimpSubscribeParams): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('mailchimp-subscribe', {
        body: params,
      });
      if (error) throw error;
      return Boolean((data as any)?.ok);
    } catch (e) {
      console.error('Mailchimp subscribe failed', e);
      return false;
    }
  }
}





