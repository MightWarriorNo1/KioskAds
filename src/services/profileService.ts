import { supabase } from '../lib/supabaseClient';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'host' | 'designer' | 'admin';
  company_name?: string;
  avatar_url?: string;
  address?: string;
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  company_name?: string;
  avatar_url?: string;
  address?: string;
}

export class ProfileService {
  // Get user profile by ID
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: ProfileUpdateData): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Update user email (requires Supabase auth update)
  static async updateEmail(newEmail: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }

  // Update user password
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Send password reset email
  static async sendPasswordReset(email: string): Promise<void> {
    try {
      // Use absolute URL for redirect - Supabase requires this to be in the allowed redirect URLs
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  }

  // Upload avatar image
  static async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${userId}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing avatar
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await this.updateProfile(userId, {
        avatar_url: urlData.publicUrl
      });

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  // Delete avatar
  static async deleteAvatar(userId: string): Promise<void> {
    try {
      // Remove avatar from storage
      const { error: deleteError } = await supabase.storage
        .from('media-assets')
        .remove([`avatars/${userId}.jpg`, `avatars/${userId}.png`, `avatars/${userId}.jpeg`]);

      // Update profile to remove avatar URL
      await this.updateProfile(userId, {
        avatar_url: undefined
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  }
}
