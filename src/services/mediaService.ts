import { supabase } from '../lib/supabaseClient';
import { MediaAsset, Inserts, Updates } from '../types/database';
import { ValidationResult } from '../utils/fileValidation';

export class MediaService {
  // Upload file to Supabase Storage and create database record
  static async uploadMedia(
    file: File,
    validation: ValidationResult,
    userId: string
  ): Promise<MediaAsset> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      // Create media asset record in database
      const mediaAsset: Inserts<'media_assets'> = {
        user_id: userId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type.startsWith('image/') ? 'image' : 'video',
        mime_type: file.type,
        dimensions: validation.dimensions!,
        duration: validation.duration ? Math.round(validation.duration) : undefined,
        status: 'processing',
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          publicUrl: urlData.publicUrl
        }
      };

      const { data: dbData, error: dbError } = await supabase
        .from('media_assets')
        .insert(mediaAsset)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return dbData;
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  // Get user's media assets
  static async getUserMedia(userId: string): Promise<MediaAsset[]> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch media: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user media:', error);
      throw error;
    }
  }

  // Get media asset by ID
  static async getMediaById(mediaId: string): Promise<MediaAsset | null> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', mediaId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to fetch media: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching media by ID:', error);
      throw error;
    }
  }

  // Update media asset status
  static async updateMediaStatus(
    mediaId: string,
    status: MediaAsset['status'],
    metadata?: Record<string, any>
  ): Promise<MediaAsset> {
    try {
      const updateData: Updates<'media_assets'> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from('media_assets')
        .update(updateData)
        .eq('id', mediaId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update media: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating media status:', error);
      throw error;
    }
  }

  // Delete media asset
  static async deleteMedia(mediaId: string): Promise<void> {
    try {
      // Get media asset to get file path
      const media = await this.getMediaById(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('media-assets')
        .remove([media.file_path]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', mediaId);

      if (dbError) {
        throw new Error(`Failed to delete media: ${dbError.message}`);
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  // Get media assets for a campaign
  static async getCampaignMedia(campaignId: string): Promise<MediaAsset[]> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select(`
          *,
          campaign_media!inner(display_order, weight)
        `)
        .eq('campaign_id', campaignId)
        .order('campaign_media.display_order', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch campaign media: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching campaign media:', error);
      throw error;
    }
  }

  // Add media to campaign
  static async addMediaToCampaign(
    mediaId: string,
    campaignId: string,
    displayOrder: number = 0,
    weight: number = 1
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_media')
        .insert({
          campaign_id: campaignId,
          media_id: mediaId,
          display_order: displayOrder,
          weight
        });

      if (error) {
        throw new Error(`Failed to add media to campaign: ${error.message}`);
      }

      // Update media asset with campaign ID
      await this.updateMediaStatus(mediaId, 'approved', { campaignId });
    } catch (error) {
      console.error('Error adding media to campaign:', error);
      throw error;
    }
  }

  // Remove media from campaign
  static async removeMediaFromCampaign(mediaId: string, campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_media')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('media_id', mediaId);

      if (error) {
        throw new Error(`Failed to remove media from campaign: ${error.message}`);
      }
    } catch (error) {
      console.error('Error removing media from campaign:', error);
      throw error;
    }
  }

  // Get storage usage for user
  static async getUserStorageUsage(userId: string): Promise<{ used: number; total: number }> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('file_size')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch storage usage: ${error.message}`);
      }

      const used = data?.reduce((sum, asset) => sum + asset.file_size, 0) || 0;
      
      // Default storage limits based on subscription tier
      // This would typically come from user profile or subscription service
      const total = 5 * 1024 * 1024 * 1024; // 5GB default

      return { used, total };
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      throw error;
    }
  }

  // Bulk upload multiple files
  static async bulkUpload(
    files: File[],
    validations: ValidationResult[],
    userId: string
  ): Promise<MediaAsset[]> {
    try {
      const uploadPromises = files.map((file, index) =>
        this.uploadMedia(file, validations[index], userId)
      );

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  }

  // Get media preview URL
  static getMediaPreviewUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('media-assets')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  // Download media file
  static async downloadMedia(filePath: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from('media-assets')
        .download(filePath);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error downloading media:', error);
      throw error;
    }
  }

  // Check if storage bucket is accessible
  static async checkStorageAccess(): Promise<boolean> {
    try {
      console.log('Starting storage access check...');
      
      // First, try to list buckets (this might fail due to permissions)
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.log('Could not list buckets (likely due to permissions):', listError.message);
        // Even if we can't list buckets, we can still try to access the media-assets bucket directly
        console.log('Attempting direct bucket access...');
        return await this.checkDirectBucketAccess();
      }
      
      console.log('Available buckets:', buckets);
      console.log('Number of buckets found:', buckets?.length || 0);
      
      if (!buckets || buckets.length === 0) {
        console.log('No buckets found - trying direct access...');
        return await this.checkDirectBucketAccess();
      }
      
      const mediaBucket = buckets.find(bucket => bucket.name === 'media-assets');
      console.log('Media bucket found:', mediaBucket);
      
      if (mediaBucket) {
        console.log('Media bucket details:', {
          id: mediaBucket.id,
          name: mediaBucket.name,
          public: mediaBucket.public
        });
        return true;
      }
      
      // If bucket not found in list, try direct access
      console.log('Media bucket not found in list, trying direct access...');
      return await this.checkDirectBucketAccess();
      
    } catch (error) {
      console.error('Storage access check error:', error);
      // Try direct access as fallback
      return await this.checkDirectBucketAccess();
    }
  }

  // Check if we can access the media-assets bucket directly
  private static async checkDirectBucketAccess(): Promise<boolean> {
    try {
      console.log('Testing direct access to media-assets bucket...');
      
      // Try to list files in the bucket (this will fail if bucket doesn't exist or no access)
      const { data: files, error } = await supabase.storage
        .from('media-assets')
        .list('', { limit: 1 });
      
      if (error) {
        console.log('Direct bucket access failed:', error.message);
        
        // If bucket doesn't exist, try to create it
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log('Bucket not found, attempting to create...');
          return await this.createMediaBucket();
        }
        
        return false;
      }
      
      console.log('Direct bucket access successful!');
      return true;
      
    } catch (error) {
      console.error('Direct bucket access error:', error);
      return false;
    }
  }

  // Create the media-assets bucket if it doesn't exist
  private static async createMediaBucket(): Promise<boolean> {
    try {
      console.log('Attempting to create media-assets bucket...');
      const { error } = await supabase.storage
        .from('media-assets')
        .createBucket('media-assets', { public: false });

      if (error) {
        console.error('Failed to create media-assets bucket:', error.message);
        return false;
      }
      console.log('media-assets bucket created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating media-assets bucket:', error);
      return false;
    }
  }
}

