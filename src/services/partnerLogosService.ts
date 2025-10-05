import { supabase } from '../lib/supabaseClient';

export interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerLogoData {
  name: string;
  logo_url: string;
  website_url?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdatePartnerLogoData extends Partial<CreatePartnerLogoData> {
  id: string;
}

export class PartnerLogosService {
  // Get all active partner logos for public display
  static async getPartnerLogos(): Promise<PartnerLogo[]> {
    try {
      const { data, error } = await supabase
        .from('partner_logos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching partner logos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPartnerLogos:', error);
      throw error;
    }
  }

  // Get all partner logos (including inactive) - admin only
  static async getAllPartnerLogos(): Promise<PartnerLogo[]> {
    try {
      const { data, error } = await supabase
        .from('partner_logos')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching all partner logos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllPartnerLogos:', error);
      throw error;
    }
  }

  // Create a new partner logo - admin only
  static async createPartnerLogo(logoData: CreatePartnerLogoData): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('partner_logos')
        .insert([logoData])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating partner logo:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createPartnerLogo:', error);
      throw error;
    }
  }

  // Update a partner logo - admin only
  static async updatePartnerLogo(logoId: string, updates: Partial<CreatePartnerLogoData>): Promise<void> {
    try {
      const { error } = await supabase
        .from('partner_logos')
        .update(updates)
        .eq('id', logoId);

      if (error) {
        console.error('Error updating partner logo:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updatePartnerLogo:', error);
      throw error;
    }
  }

  // Delete a partner logo - admin only
  static async deletePartnerLogo(logoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('partner_logos')
        .delete()
        .eq('id', logoId);

      if (error) {
        console.error('Error deleting partner logo:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deletePartnerLogo:', error);
      throw error;
    }
  }

  // Toggle partner logo active status - admin only
  static async togglePartnerLogoStatus(logoId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('partner_logos')
        .update({ is_active: isActive })
        .eq('id', logoId);

      if (error) {
        console.error('Error toggling partner logo status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in togglePartnerLogoStatus:', error);
      throw error;
    }
  }

  // Reorder partner logos - admin only
  static async reorderPartnerLogos(logoIds: string[]): Promise<void> {
    try {
      const updates = logoIds.map((id, index) => ({
        id,
        display_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('partner_logos')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) {
          console.error('Error reordering partner logos:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in reorderPartnerLogos:', error);
      throw error;
    }
  }
}
