import { supabase } from '../lib/supabaseClient';
import type { Inserts } from '../types/database';

export interface CustomAdOrderInput {
  userId: string;
  serviceKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  files: File[];
  totalAmount: number; // in USD dollars
}

export interface UploadedFileSummary {
  name: string;
  url: string;
  size: number;
  type: string;
}

export class CustomAdsService {
  static async uploadFiles(userId: string, files: File[]): Promise<UploadedFileSummary[]> {
    if (!files || files.length === 0) return [];
    const uploaded: UploadedFileSummary[] = [];
    for (const file of files) {
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from('custom-ad-uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: pubUrl } = supabase.storage.from('custom-ad-uploads').getPublicUrl(path);
      uploaded.push({ name: file.name, url: pubUrl.publicUrl, size: file.size, type: file.type });
    }
    return uploaded;
  }

  static async createOrder(input: CustomAdOrderInput): Promise<string> {
    const uploaded = await this.uploadFiles(input.userId, input.files);
    const payload: Inserts<'custom_ad_orders'> = {
      user_id: input.userId,
      service_key: input.serviceKey,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      details: input.details,
      files: uploaded,
      total_amount: Number(input.totalAmount.toFixed(2)),
      payment_status: 'succeeded',
    };

    const { data, error } = await supabase
      .from('custom_ad_orders')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  }
}


