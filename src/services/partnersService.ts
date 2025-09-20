import { supabase } from '../lib/supabaseClient';

export interface Partner {
  id: string;
  title: string;
  address: string;
  photo_url?: string;
  kiosk_map_url?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerData {
  title: string;
  address: string;
  photo_url?: string;
  kiosk_map_url?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  display_order?: number;
}

export interface UpdatePartnerData extends Partial<CreatePartnerData> {
  is_active?: boolean;
}

export class PartnersService {
  // Get all active partners
  static async getPartners(): Promise<Partner[]> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching partners:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPartners:', error);
      throw error;
    }
  }

  // Get all partners (including inactive) - admin only
  static async getAllPartners(): Promise<Partner[]> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching all partners:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllPartners:', error);
      throw error;
    }
  }

  // Get partner by ID
  static async getPartnerById(id: string): Promise<Partner | null> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching partner:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPartnerById:', error);
      throw error;
    }
  }

  // Create new partner
  static async createPartner(partnerData: CreatePartnerData): Promise<Partner> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .insert([partnerData])
        .select()
        .single();

      if (error) {
        console.error('Error creating partner:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createPartner:', error);
      throw error;
    }
  }

  // Update partner
  static async updatePartner(id: string, partnerData: UpdatePartnerData): Promise<Partner> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .update({
          ...partnerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating partner:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updatePartner:', error);
      throw error;
    }
  }

  // Delete partner
  static async deletePartner(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting partner:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deletePartner:', error);
      throw error;
    }
  }

  // Toggle partner active status
  static async togglePartnerStatus(id: string, isActive: boolean): Promise<Partner> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error toggling partner status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in togglePartnerStatus:', error);
      throw error;
    }
  }

  // Update partner display order
  static async updatePartnerOrder(partners: { id: string; display_order: number }[]): Promise<void> {
    try {
      const updates = partners.map(partner => 
        supabase
          .from('partners')
          .update({ 
            display_order: partner.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', partner.id)
      );

      const results = await Promise.all(updates);
      
      for (const result of results) {
        if (result.error) {
          console.error('Error updating partner order:', result.error);
          throw result.error;
        }
      }
    } catch (error) {
      console.error('Error in updatePartnerOrder:', error);
      throw error;
    }
  }
}
