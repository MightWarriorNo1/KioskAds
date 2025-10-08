import { supabase } from '../lib/supabaseClient';

export interface Kiosk {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  traffic_level: 'low' | 'medium' | 'high';
  base_rate: number;
  price: number;
  status: 'active' | 'inactive' | 'maintenance';
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
  content_restrictions?: string[];
  created_at: string;
  updated_at: string;
}

export interface KioskFilters {
  status?: 'active' | 'inactive' | 'maintenance';
  traffic_level?: 'low' | 'medium' | 'high';
  city?: string;
  state?: string;
}

export class KioskService {
  // Get all kiosks with optional filters
  static async getKiosks(filters: KioskFilters = {}): Promise<Kiosk[]> {
    try {
      let query = supabase
        .from('kiosks')
        .select('*')
        .order('name');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.traffic_level) {
        query = query.eq('traffic_level', filters.traffic_level);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch kiosks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching kiosks:', error);
      throw error;
    }
  }

  // Get kiosk by ID
  static async getKioskById(id: string): Promise<Kiosk | null> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Kiosk not found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching kiosk:', error);
      throw error;
    }
  }

  // Get active kiosks only (for public display)
  static async getActiveKiosks(): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch active kiosks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching active kiosks:', error);
      throw error;
    }
  }

  // Get kiosks by city
  static async getKiosksByCity(city: string): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('city', city)
        .eq('status', 'active')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch kiosks by city: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching kiosks by city:', error);
      throw error;
    }
  }

  // Get unique cities with kiosks
  static async getKioskCities(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('city')
        .eq('status', 'active')
        .order('city');

      if (error) {
        throw new Error(`Failed to fetch kiosk cities: ${error.message}`);
      }

      // Extract unique cities
      const cities = [...new Set(data?.map(kiosk => kiosk.city) || [])];
      return cities;
    } catch (error) {
      console.error('Error fetching kiosk cities:', error);
      throw error;
    }
  }

  // Get kiosks with traffic level filter
  static async getKiosksByTrafficLevel(trafficLevel: 'low' | 'medium' | 'high'): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('traffic_level', trafficLevel)
        .eq('status', 'active')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch kiosks by traffic level: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching kiosks by traffic level:', error);
      throw error;
    }
  }

  // Search kiosks by name or location
  static async searchKiosks(searchTerm: string): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .order('name');

      if (error) {
        throw new Error(`Failed to search kiosks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching kiosks:', error);
      throw error;
    }
  }
}
