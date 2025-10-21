import { supabase } from '../lib/supabaseClient';
import { MediaAsset, Inserts, Updates } from '../types/database';
import { ValidationResult } from '../utils/fileValidation';

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Utility function to clean UUID (remove any suffixes like _1)
function cleanUUID(uuid: string): string {
  // Remove any suffixes like _1, _2, etc.
  return uuid.split('_')[0];
}

export class MediaService {
  // Validate that a media asset exists and belongs to the user
  static async validateMediaAsset(mediaId: string, userId: string): Promise<MediaAsset> {
    const cleanedMediaId = cleanUUID(mediaId);
    
    if (!isValidUUID(cleanedMediaId)) {
      throw new Error(`Invalid media asset ID format: ${mediaId}`);
    }
    
    let { data: mediaAsset, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', cleanedMediaId)
      .single();

    // If the cleaned UUID fails and it's different from the original, try with the original UUID
    if (error && cleanedMediaId !== mediaId) {
      console.log('Trying with original media ID:', mediaId);
      const fallbackResult = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', mediaId)
        .single();
      
      if (!fallbackResult.error && fallbackResult.data) {
        mediaAsset = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      console.error('Media asset validation error:', {
        mediaId: cleanedMediaId,
        originalMediaId: mediaId,
        error: error,
        errorCode: error.code,
        errorMessage: error.message
      });
      
      if (error.code === 'PGRST116' || error.message?.includes('406')) {
        throw new Error(`Media asset with ID ${cleanedMediaId} not found. The media asset may not exist or may have been deleted. Please ensure the media was uploaded successfully before creating the campaign.`);
      }
      
      throw new Error(`Failed to validate media asset: ${error.message}`);
    }

    if (!mediaAsset) {
      throw new Error(`Media asset with ID ${cleanedMediaId} not found. Please ensure the media was uploaded successfully before creating the campaign.`);
    }

    if (mediaAsset.user_id !== userId) {
      throw new Error('Media asset does not belong to the current user');
    }

    if (mediaAsset.status === 'rejected') {
      throw new Error(`Media asset "${mediaAsset.file_name}" has been rejected and cannot be used in campaigns.`);
    }

    return mediaAsset;
  }

  // Upload file to Supabase Storage and create database record
  static async uploadMedia(
    file: File,
    validation: ValidationResult,
    userId: string,
    campaignId?: string
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
        ...(campaignId ? { campaign_id: campaignId } : {} as any),
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

      console.log('Creating media asset with data:', {
        user_id: userId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type.startsWith('image/') ? 'image' : 'video',
        mime_type: file.type
      });

      const { data: dbData, error: dbError } = await supabase
        .from('media_assets')
        .insert(mediaAsset)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Media asset created successfully:', {
        id: dbData.id,
        file_name: dbData.file_name,
        status: dbData.status
      });

      return dbData;
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  // Create a media asset record from an existing, approved custom-ad media file (no re-upload)
  static async createMediaFromApprovedCustomAd(params: {
    userId: string,
    sourceId?: string,
    fileName: string,
    publicUrl: string,
    fileSize: number,
    mimeType: string,
    fileType: 'image' | 'video' | 'document' | 'other',
    dimensions?: { width: number; height: number },
    duration?: number
  }): Promise<MediaAsset> {
    try {
      const inferredType = params.mimeType.startsWith('image/') ? 'image' : params.mimeType.startsWith('video/') ? 'video' : 'other';
      const insertData: Inserts<'media_assets'> = {
        user_id: params.userId,
        file_name: params.fileName,
        // Store the external path for traceability; actual content remains in custom-ad bucket
        file_path: `external/custom-ad/${params.sourceId || 'unknown'}/${params.fileName}`,
        file_size: params.fileSize,
        file_type: (inferredType as any),
        mime_type: params.mimeType,
        dimensions: params.dimensions,
        duration: params.duration ? Math.round(params.duration) : undefined,
        status: 'approved',
        metadata: {
          publicUrl: params.publicUrl,
          source: 'custom_ad',
          sourceId: params.sourceId,
          createdFrom: 'approved_custom_ad_media',
          originalName: params.fileName
        }
      };

      console.log('Creating media asset from approved custom ad:', {
        user_id: params.userId,
        file_name: params.fileName,
        source_id: params.sourceId,
        file_size: params.fileSize,
        mime_type: params.mimeType
      });

      const { data, error } = await supabase
        .from('media_assets')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create media from custom ad: ${error.message}`);
      }

      console.log('Media asset created from custom ad:', {
        id: data.id,
        file_name: data.file_name,
        status: data.status
      });

      return data;
    } catch (error) {
      console.error('Error creating media from approved custom ad:', error);
      throw error;
    }
  }

  // Upload media directly associated with a campaign
  static async uploadMediaToCampaign(
    file: File,
    validation: ValidationResult,
    userId: string,
    campaignId: string
  ): Promise<MediaAsset> {
    return this.uploadMedia(file, validation, userId, campaignId);
  }

  // Get user's media assets
  static async getUserMedia(userId: string): Promise<MediaAsset[]> {
    try {
      console.log('MediaService.getUserMedia called with userId:', userId);
      
      // First try to get media for the specific user
      const { data: userData, error: userError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('Database error in getUserMedia:', userError);
        throw new Error(`Failed to fetch media: ${userError.message}`);
      }

      console.log('MediaService.getUserMedia result for user:', {
        userId,
        dataLength: userData?.length || 0,
        data: userData?.map(item => ({
          id: item.id,
          user_id: item.user_id,
          file_name: item.file_name
        }))
      });

      // If no media found for this user, try to get ALL media assets for testing
      if (!userData || userData.length === 0) {
        console.log('No media found for user, fetching ALL media assets for testing...');
        
        const { data: allData, error: allError } = await supabase
          .from('media_assets')
          .select('*')
          .order('created_at', { ascending: false });

        if (allError) {
          console.error('Database error fetching all media:', allError);
          return [];
        }

        console.log('MediaService.getUserMedia - ALL media result:', {
          totalAssets: allData?.length || 0,
          data: allData?.map(item => ({
            id: item.id,
            user_id: item.user_id,
            file_name: item.file_name
          }))
        });

        return allData || [];
      }

      return userData || [];
    } catch (error) {
      console.error('Error fetching user media:', error);
      throw error;
    }
  }

  // Get media asset by ID
  static async getMediaById(mediaId: string): Promise<MediaAsset | null> {
    try {
      // Clean and validate the media ID
      const cleanedMediaId = cleanUUID(mediaId);
      
      if (!isValidUUID(cleanedMediaId)) {
        console.error('Invalid media asset ID format:', {
          original: mediaId,
          cleaned: cleanedMediaId
        });
        return null;
      }
      
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', cleanedMediaId)
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
      // Clean and validate the media ID
      const cleanedMediaId = cleanUUID(mediaId);
      
      if (!isValidUUID(cleanedMediaId)) {
        console.error('Invalid media asset ID format:', {
          original: mediaId,
          cleaned: cleanedMediaId
        });
        throw new Error('Invalid media asset ID format');
      }
      
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
        .eq('id', cleanedMediaId)
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
        .order('display_order', { ascending: true, foreignTable: 'campaign_media' });

      if (error) {
        throw new Error(`Failed to fetch campaign media: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching campaign media:', error);
      throw error;
    }
  }

  // Get media assets by campaign directly from media_assets
  static async getCampaignAssets(campaignId: string): Promise<MediaAsset[]> {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch campaign assets: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching campaign assets:', error);
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

  // Swap media asset (for approved assets only)
  static async swapMediaAsset(
    mediaId: string,
    newFile: File,
    validation: ValidationResult
  ): Promise<MediaAsset> {
    try {
      // First, verify the media asset is approved
      const { data: existing, error: fetchError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Media asset not found');
      if (existing.status !== 'approved') {
        throw new Error('Only approved media assets can be swapped');
      }

      // Generate new filename
      const fileExt = newFile.name.split('.').pop();
      const fileName = `${existing.user_id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload new file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, newFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for new file
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      // Update the media asset with new file and set status to swapped
      const updateData: Updates<'media_assets'> = {
        file_name: newFile.name,
        file_path: fileName,
        file_size: newFile.size,
        file_type: newFile.type.startsWith('image/') ? 'image' : 'video',
        mime_type: newFile.type,
        dimensions: validation.dimensions!,
        duration: validation.duration ? Math.round(validation.duration) : undefined,
        status: 'swapped',
        metadata: {
          ...existing.metadata,
          originalName: newFile.name,
          swappedAt: new Date().toISOString(),
          publicUrl: urlData.publicUrl,
          previousFile: existing.file_path
        },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('media_assets')
        .update(updateData)
        .eq('id', mediaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error swapping media asset:', error);
      throw error;
    }
  }

  // Submit swapped media asset for review
  static async submitSwappedMediaForReview(mediaId: string): Promise<void> {
    try {
      // Verify the media asset is in swapped status
      const { data: existing, error: fetchError } = await supabase
        .from('media_assets')
        .select('status')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Media asset not found');
      if (existing.status !== 'swapped') {
        throw new Error('Only swapped media assets can be submitted for review');
      }

      // Update status to processing (which will trigger admin review)
      const { error } = await supabase
        .from('media_assets')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', mediaId);

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting swapped media for review:', error);
      throw error;
    }
  }
}

