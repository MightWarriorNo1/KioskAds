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
  // Generate a hash for file uniqueness
  private static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
  }

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
        try {
          await this.uploadMediaFiles(data.id, input.files);
        } catch (uploadError) {
          console.error('Error uploading files, cleaning up custom ad creation:', uploadError);
          // If file upload fails, clean up the custom ad creation record
          await supabase
            .from('custom_ad_creations')
            .delete()
            .eq('id', data.id);
          throw new Error(`Failed to upload files: ${uploadError.message}`);
        }
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
      const uploadedFileNames: string[] = []; // Track uploaded files for cleanup
      const processedFiles = new Set<string>(); // Track processed files in this session

      // Upload each valid file
      for (const file of validation.validFiles) {
        // Create a unique key for this file in this session
        const fileKey = `${file.name}-${file.size}-${file.type}`;
        
        // Skip if we've already processed this file in this session
        if (processedFiles.has(fileKey)) {
          console.log(`File already processed in this session: ${file.name}, skipping`);
          continue;
        }
        processedFiles.add(fileKey);
        const fileValidation = await validateCustomAdFile(file);
        
        // Generate unique filename with better uniqueness
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fileHash = await this.generateFileHash(file);
        const fileName = `${customAdCreationId}/${timestamp}-${randomId}-${fileHash}.${fileExt}`;

        try {
          
          // Check if file with same hash already exists for this custom ad creation
          const { data: existingFiles } = await supabase
            .from('custom_ad_media_files')
            .select('file_path, metadata, original_name')
            .eq('custom_ad_creation_id', customAdCreationId);

          const existingFile = existingFiles?.find(f => {
            // Check by file hash if available
            if (f.metadata && typeof f.metadata === 'object' && 'fileHash' in f.metadata) {
              return f.metadata.fileHash === fileHash;
            }
            // Fallback: check by original name and size
            return f.original_name === file.name;
          });

          if (existingFile) {
            console.log(`File with same content already exists: ${file.name}, skipping upload`);
            continue;
          }

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
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
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
              validation: fileValidation,
              fileHash: fileHash
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
            // Clean up uploaded file from storage if database insert fails
            await supabase.storage
              .from('custom-ad-media')
              .remove([fileName]);
            throw new Error(`Failed to save file record for ${file.name}: ${dbError.message}`);
          }

          uploadedFiles.push(dbData);
          uploadedFileNames.push(fileName);
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError);
          // If this is not the last file, continue with others
          if (validation.validFiles.indexOf(file) < validation.validFiles.length - 1) {
            continue;
          } else {
            // If this is the last file and there are other files that succeeded, 
            // we should still return the successful uploads
            if (uploadedFiles.length > 0) {
              console.warn(`Some files uploaded successfully, but ${file.name} failed:`, fileError);
              break;
            } else {
              // If no files succeeded, throw the error
              throw fileError;
            }
          }
        }
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

  // Clean up orphaned files in storage (admin function)
  static async cleanupOrphanedFiles(): Promise<{ cleaned: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let cleaned = 0;

      // Get all files in storage
      const { data: storageFiles, error: listError } = await supabase.storage
        .from('custom-ad-media')
        .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

      if (listError) {
        throw new Error(`Failed to list storage files: ${listError.message}`);
      }

      if (!storageFiles || storageFiles.length === 0) {
        return { cleaned: 0, errors: [] };
      }

      // Get all file paths from database
      const { data: dbFiles, error: dbError } = await supabase
        .from('custom_ad_media_files')
        .select('file_path');

      if (dbError) {
        throw new Error(`Failed to get database files: ${dbError.message}`);
      }

      const dbFilePaths = new Set(dbFiles?.map(f => f.file_path) || []);

      // Find orphaned files
      const orphanedFiles: string[] = [];
      for (const storageFile of storageFiles) {
        if (storageFile.name && !dbFilePaths.has(storageFile.name)) {
          orphanedFiles.push(storageFile.name);
        }
      }

      // Remove orphaned files
      if (orphanedFiles.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('custom-ad-media')
          .remove(orphanedFiles);

        if (removeError) {
          errors.push(`Failed to remove orphaned files: ${removeError.message}`);
        } else {
          cleaned = orphanedFiles.length;
        }
      }

      return { cleaned, errors };
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      throw error;
    }
  }

  // Validate file integrity (admin function)
  static async validateFileIntegrity(customAdCreationId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Get all media files for this custom ad creation
      const { data: mediaFiles, error: dbError } = await supabase
        .from('custom_ad_media_files')
        .select('*')
        .eq('custom_ad_creation_id', customAdCreationId);

      if (dbError) {
        throw new Error(`Failed to get media files: ${dbError.message}`);
      }

      if (!mediaFiles || mediaFiles.length === 0) {
        return { valid: true, issues: [] };
      }

      // Check each file
      for (const mediaFile of mediaFiles) {
        // Check if file exists in storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('custom-ad-media')
          .download(mediaFile.file_path);

        if (fileError || !fileData) {
          issues.push(`File not found in storage: ${mediaFile.original_name} (${mediaFile.file_path})`);
        }

        // Check if public URL is accessible
        try {
          const response = await fetch(mediaFile.public_url, { method: 'HEAD' });
          if (!response.ok) {
            issues.push(`Public URL not accessible: ${mediaFile.original_name} (${mediaFile.public_url})`);
          }
        } catch (urlError) {
          issues.push(`Public URL error: ${mediaFile.original_name} - ${urlError}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating file integrity:', error);
      throw error;
    }
  }

  // Clean up duplicate files for a custom ad creation (admin function)
  static async cleanupDuplicateFiles(customAdCreationId: string): Promise<{
    removed: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let removed = 0;

      // Get all media files for this custom ad creation
      const { data: mediaFiles, error: dbError } = await supabase
        .from('custom_ad_media_files')
        .select('*')
        .eq('custom_ad_creation_id', customAdCreationId);

      if (dbError) {
        throw new Error(`Failed to get media files: ${dbError.message}`);
      }

      if (!mediaFiles || mediaFiles.length === 0) {
        return { removed: 0, errors: [] };
      }

      // Group files by original name and file hash
      const fileGroups = new Map<string, typeof mediaFiles>();
      for (const file of mediaFiles) {
        const key = `${file.original_name}-${file.metadata?.fileHash || 'no-hash'}`;
        if (!fileGroups.has(key)) {
          fileGroups.set(key, []);
        }
        fileGroups.get(key)!.push(file);
      }

      // Remove duplicates (keep the first one, remove the rest)
      for (const [key, files] of fileGroups) {
        if (files.length > 1) {
          // Sort by created_at to keep the oldest one
          files.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          // Remove all but the first one
          const filesToRemove = files.slice(1);
          
          for (const fileToRemove of filesToRemove) {
            try {
              // Remove from storage
              await supabase.storage
                .from('custom-ad-media')
                .remove([fileToRemove.file_path]);

              // Remove from database
              await supabase
                .from('custom_ad_media_files')
                .delete()
                .eq('id', fileToRemove.id);

              removed++;
            } catch (removeError) {
              errors.push(`Failed to remove duplicate file ${fileToRemove.original_name}: ${removeError}`);
            }
          }
        }
      }

      return { removed, errors };
    } catch (error) {
      console.error('Error cleaning up duplicate files:', error);
      throw error;
    }
  }

  // Clean up all duplicate files across all custom ad creations (admin function)
  static async cleanupAllDuplicateFiles(): Promise<{
    removed: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let removed = 0;

      // Get all custom ad creations
      const { data: creations, error: creationsError } = await supabase
        .from('custom_ad_creations')
        .select('id');

      if (creationsError) {
        throw new Error(`Failed to get custom ad creations: ${creationsError.message}`);
      }

      if (!creations || creations.length === 0) {
        return { removed: 0, errors: [] };
      }

      // Clean up duplicates for each creation
      for (const creation of creations) {
        try {
          const result = await this.cleanupDuplicateFiles(creation.id);
          removed += result.removed;
          errors.push(...result.errors);
        } catch (creationError) {
          errors.push(`Failed to clean up creation ${creation.id}: ${creationError}`);
        }
      }

      return { removed, errors };
    } catch (error) {
      console.error('Error cleaning up all duplicate files:', error);
      throw error;
    }
  }
}
