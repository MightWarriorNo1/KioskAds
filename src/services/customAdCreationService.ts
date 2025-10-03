import { supabase } from '../lib/supabaseClient';
import { Database, Inserts, Updates } from '../types/database';
import { validateCustomAdFile, validateCustomAdFiles, getAspectRatio } from '../utils/customAdFileValidation';

export type CustomAdCreation = Database['public']['Tables']['custom_ad_creations']['Row'];
export type CustomAdMediaFile = Database['public']['Tables']['custom_ad_media_files']['Row'];
export type CustomAdCreationNote = Database['public']['Tables']['custom_ad_creation_notes']['Row'];
export type CustomAdCreationAssignment = Database['public']['Tables']['custom_ad_creation_assignments']['Row'];

export interface CustomAdCreationInput {
  title: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  budgetRange?: string;
  deadline?: string;
  specialRequirements?: string;
  targetAudience?: string;
  brandGuidelines?: string;
  files?: File[];
}

export interface CustomAdCreationWithFiles extends CustomAdCreation {
  media_files: CustomAdMediaFile[];
  notes: CustomAdCreationNote[];
  assignments: CustomAdCreationAssignment[];
}

export interface UploadedFileInfo {
  file: File;
  validation: {
    isValid: boolean;
    errors: string[];
    dimensions?: { width: number; height: number };
    duration?: number;
    fileType: 'image' | 'video' | 'document' | 'other';
  };
}

export class CustomAdCreationService {
  // Create a new custom ad creation request
  static async createCustomAdCreation(
    userId: string,
    input: CustomAdCreationInput
  ): Promise<CustomAdCreation> {
    try {
      console.log('Creating custom ad creation for user:', userId, 'with input:', input);
      
      const creationData: Inserts<'custom_ad_creations'> = {
        user_id: userId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority || 'normal',
        budget_range: input.budgetRange,
        deadline: input.deadline,
        special_requirements: input.specialRequirements,
        target_audience: input.targetAudience,
        brand_guidelines: input.brandGuidelines,
        status: 'draft'
      };

      console.log('Inserting custom ad creation data:', creationData);

      const { data, error } = await supabase
        .from('custom_ad_creations')
        .insert(creationData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating custom ad creation:', error);
        throw error;
      }

      console.log('Custom ad creation created successfully:', data);

      // Upload files if provided
      if (input.files && input.files.length > 0) {
        console.log('Uploading media files:', input.files.length, 'files');
        await this.uploadMediaFiles(data.id, input.files);
      }

      return data;
    } catch (error) {
      console.error('Error creating custom ad creation:', error);
      throw error;
    }
  }

  // Upload media files for a custom ad creation
  static async uploadMediaFiles(
    customAdCreationId: string,
    files: File[]
  ): Promise<CustomAdMediaFile[]> {
    try {
      // Validate all files first
      const validation = await validateCustomAdFiles(files);
      
      if (validation.invalidFiles.length > 0) {
        const errorMessages = validation.invalidFiles.map(
          ({ file, errors }) => `${file.name}: ${errors.join(', ')}`
        );
        throw new Error(`File validation failed: ${errorMessages.join('; ')}`);
      }

      const uploadedFiles: CustomAdMediaFile[] = [];

      // Upload each valid file
      for (const file of validation.validFiles) {
        const fileValidation = await validateCustomAdFile(file);
        
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${customAdCreationId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-ad-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Storage upload error for file:', file.name, uploadError);
          continue; // Skip this file and continue with others
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('custom-ad-media')
          .getPublicUrl(fileName);

        // Calculate aspect ratio if dimensions are available
        let aspectRatio: string | undefined;
        if (fileValidation.dimensions) {
          aspectRatio = getAspectRatio(
            fileValidation.dimensions.width,
            fileValidation.dimensions.height
          );
        }

        // Create database record
        const mediaFileData: Inserts<'custom_ad_media_files'> = {
          custom_ad_creation_id: customAdCreationId,
          file_name: fileName,
          original_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: fileValidation.fileType,
          mime_type: file.type,
          dimensions: fileValidation.dimensions,
          duration: fileValidation.duration,
          aspect_ratio: aspectRatio,
          file_category: fileValidation.fileType,
          storage_bucket: 'custom-ad-media',
          public_url: urlData.publicUrl,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            validation: fileValidation
          },
          processing_status: 'completed'
        };

        const { data: dbData, error: dbError } = await supabase
          .from('custom_ad_media_files')
          .insert(mediaFileData)
          .select()
          .single();

        if (dbError) {
          console.error('Database error for file:', file.name, dbError);
          continue; // Skip this file and continue with others
        }

        uploadedFiles.push(dbData);
      }

      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading media files:', error);
      throw error;
    }
  }

  // Get custom ad creation with all related data
  static async getCustomAdCreation(id: string): Promise<CustomAdCreationWithFiles | null> {
    try {
      const { data, error } = await supabase
        .from('custom_ad_creations')
        .select(`
          *,
          media_files:custom_ad_media_files(*),
          notes:custom_ad_creation_notes(*),
          assignments:custom_ad_creation_assignments(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return data as CustomAdCreationWithFiles;
    } catch (error) {
      console.error('Error fetching custom ad creation:', error);
      throw error;
    }
  }

  // Get all custom ad creations for a user
  static async getUserCustomAdCreations(userId: string): Promise<CustomAdCreationWithFiles[]> {
    try {
      console.log('Fetching custom ad creations for user:', userId);
      
      const { data, error } = await supabase
        .from('custom_ad_creations')
        .select(`
          *,
          media_files:custom_ad_media_files(*),
          notes:custom_ad_creation_notes(*),
          assignments:custom_ad_creation_assignments(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Retrieved custom ad creations:', data);
      return data as CustomAdCreationWithFiles[];
    } catch (error) {
      console.error('Error fetching user custom ad creations:', error);
      throw error;
    }
  }

  // Update custom ad creation
  static async updateCustomAdCreation(
    id: string,
    updates: Updates<'custom_ad_creations'>
  ): Promise<CustomAdCreation> {
    try {
      const { data, error } = await supabase
        .from('custom_ad_creations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating custom ad creation:', error);
      throw error;
    }
  }

  // Submit custom ad creation for review
  static async submitForReview(id: string): Promise<CustomAdCreation> {
    try {
      const { data, error } = await supabase
        .from('custom_ad_creations')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error submitting custom ad creation for review:', error);
      throw error;
    }
  }

  // Add a note to custom ad creation
  static async addNote(
    customAdCreationId: string,
    authorId: string,
    content: string,
    noteType: 'comment' | 'requirement' | 'feedback' | 'approval' | 'rejection' = 'comment',
    isInternal: boolean = false
  ): Promise<CustomAdCreationNote> {
    try {
      const noteData: Inserts<'custom_ad_creation_notes'> = {
        custom_ad_creation_id: customAdCreationId,
        author_id: authorId,
        content,
        note_type: noteType,
        is_internal: isInternal
      };

      const { data, error } = await supabase
        .from('custom_ad_creation_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding note to custom ad creation:', error);
      throw error;
    }
  }

  // Assign custom ad creation to team member
  static async assignToUser(
    customAdCreationId: string,
    assignedToId: string,
    role: string,
    assignedById: string
  ): Promise<CustomAdCreationAssignment> {
    try {
      const assignmentData: Inserts<'custom_ad_creation_assignments'> = {
        custom_ad_creation_id: customAdCreationId,
        assigned_to_id: assignedToId,
        role,
        assigned_by_id: assignedById
      };

      const { data, error } = await supabase
        .from('custom_ad_creation_assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning custom ad creation:', error);
      throw error;
    }
  }

  // Delete custom ad creation (only if in draft status)
  static async deleteCustomAdCreation(id: string): Promise<void> {
    try {
      // First check if it's in draft status
      const { data: creation, error: fetchError } = await supabase
        .from('custom_ad_creations')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (creation.status !== 'draft') {
        throw new Error('Only draft custom ad creations can be deleted');
      }

      // Delete media files from storage first
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('custom_ad_media_files')
        .select('file_path')
        .eq('custom_ad_creation_id', id);

      if (mediaError) throw mediaError;

      // Delete files from storage
      for (const file of mediaFiles) {
        await supabase.storage
          .from('custom-ad-media')
          .remove([file.file_path]);
      }

      // Delete the custom ad creation (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('custom_ad_creations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting custom ad creation:', error);
      throw error;
    }
  }

  // Remove a media file from custom ad creation
  static async removeMediaFile(fileId: string): Promise<void> {
    try {
      // Get file info first
      const { data: fileData, error: fetchError } = await supabase
        .from('custom_ad_media_files')
        .select('file_path, custom_ad_creation_id')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Check if custom ad creation is in draft status
      const { data: creation, error: creationError } = await supabase
        .from('custom_ad_creations')
        .select('status')
        .eq('id', fileData.custom_ad_creation_id)
        .single();

      if (creationError) throw creationError;

      if (creation.status !== 'draft') {
        throw new Error('Files can only be removed from draft custom ad creations');
      }

      // Delete from storage
      await supabase.storage
        .from('custom-ad-media')
        .remove([fileData.file_path]);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('custom_ad_media_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error removing media file:', error);
      throw error;
    }
  }

  // Get all custom ad creations (admin view)
  static async getAllCustomAdCreations(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CustomAdCreationWithFiles[]> {
    try {
      let query = supabase
        .from('custom_ad_creations')
        .select(`
          *,
          media_files:custom_ad_media_files(*),
          notes:custom_ad_creation_notes(*),
          assignments:custom_ad_creation_assignments(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as CustomAdCreationWithFiles[];
    } catch (error) {
      console.error('Error fetching all custom ad creations:', error);
      throw error;
    }
  }

  // Update custom ad creation status (admin function)
  static async updateStatus(
    id: string,
    status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed',
    note?: string
  ): Promise<CustomAdCreation> {
    try {
      const updates: Updates<'custom_ad_creations'> = {
        status,
        reviewed_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('custom_ad_creations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add note if provided
      if (note) {
        await this.addNote(
          id,
          (await supabase.auth.getUser()).data.user?.id || '',
          note,
          status === 'approved' ? 'approval' : status === 'rejected' ? 'rejection' : 'feedback',
          true
        );
      }

      return data;
    } catch (error) {
      console.error('Error updating custom ad creation status:', error);
      throw error;
    }
  }
}
