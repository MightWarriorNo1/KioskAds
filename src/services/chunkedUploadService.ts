import { supabase } from '../lib/supabaseClient';
import { ValidationResult } from '../utils/fileValidation';
import { MediaAsset, Inserts } from '../types/database';

export interface ChunkUploadProgress {
  uploadId: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number;
  totalSize: number;
  uploadedSize: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'preparing' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export interface ChunkUploadOptions {
  chunkSize?: number; // Default: 2MB for fast parallel uploads
  maxConcurrentChunks?: number; // Default: 3 for optimal performance
  onProgress?: (progress: ChunkUploadProgress) => void;
  onComplete?: (mediaAsset: MediaAsset) => void;
  onError?: (error: Error) => void;
}

interface ChunkInfo {
  chunkIndex: number;
  start: number;
  end: number;
  blob: Blob;
  uploaded: boolean;
  retryCount: number;
}

interface UploadSession {
  uploadId: string;
  file: File;
  fileName: string;
  totalChunks: number;
  chunks: ChunkInfo[];
  validation: ValidationResult;
  userId: string;
  startTime: number;
  lastProgressTime: number;
  uploadedBytes: number;
  status: ChunkUploadProgress['status'];
  options: Required<ChunkUploadOptions>;
}

export class ChunkedUploadService {
  private static activeSessions = new Map<string, UploadSession>();
  private static readonly DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for optimal speed
  private static readonly MAX_CONCURRENT_CHUNKS = 3; // Optimal for most connections
  private static readonly MAX_RETRIES = 3;

  static async startUpload(
    file: File,
    validation: ValidationResult,
    userId: string,
    options: ChunkUploadOptions = {}
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const maxConcurrentChunks = options.maxConcurrentChunks || this.MAX_CONCURRENT_CHUNKS;

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const session: UploadSession = {
      uploadId,
      file,
      fileName,
      totalChunks: 0,
      chunks: [],
      validation,
      userId,
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      uploadedBytes: 0,
      status: 'preparing',
      options: {
        chunkSize,
        maxConcurrentChunks,
        onProgress: options.onProgress || (() => {}),
        onComplete: options.onComplete || (() => {}),
        onError: options.onError || (() => {})
      }
    };

    this.activeSessions.set(uploadId, session);

    // Start chunk preparation and upload in parallel
    this.prepareAndStartUpload(uploadId);

    return uploadId;
  }

  private static async prepareAndStartUpload(uploadId: string): Promise<void> {
    const session = this.activeSessions.get(uploadId);
    if (!session) return;

    try {
      // Prepare chunks in background while starting validation
      const chunkSize = session.options.chunkSize;
      const totalChunks = Math.ceil(session.file.size / chunkSize);
      const chunks: ChunkInfo[] = [];

      // Create chunks asynchronously
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, session.file.size);
        chunks.push({
          chunkIndex: i,
          start,
          end,
          blob: session.file.slice(start, end),
          uploaded: false,
          retryCount: 0
        });
      }

      // Update session with prepared chunks
      session.totalChunks = totalChunks;
      session.chunks = chunks;
      session.status = 'uploading';
      this.updateProgress(uploadId);

      // Start the upload process immediately
      this.processUpload(uploadId);

    } catch (error) {
      session.status = 'error';
      session.options.onError(error as Error);
      this.updateProgress(uploadId);
    }
  }

  private static async processUpload(uploadId: string): Promise<void> {
    const session = this.activeSessions.get(uploadId);
    if (!session) return;

    try {
      session.status = 'uploading';
      this.updateProgress(uploadId);

      // Upload chunks in parallel batches
      const pendingChunks = session.chunks.filter(chunk => !chunk.uploaded);
      
      while (pendingChunks.length > 0 && session.status === 'uploading') {
        const batch = pendingChunks.splice(0, session.options.maxConcurrentChunks);
        await Promise.all(batch.map(chunk => this.uploadChunk(uploadId, chunk)));
      }

      if (session.status === 'uploading') {
        // All chunks uploaded successfully, combine them
        await this.finalizeUpload(uploadId);
      }
    } catch (error) {
      session.status = 'error';
      session.options.onError(error as Error);
      this.updateProgress(uploadId);
    }
  }

  private static async uploadChunk(uploadId: string, chunk: ChunkInfo): Promise<void> {
    const session = this.activeSessions.get(uploadId);
    if (!session || session.status !== 'uploading') return;

    try {
      const chunkFileName = `${session.fileName}.chunk.${chunk.chunkIndex}`;
      
      const { error } = await supabase.storage
        .from('media-assets')
        .upload(chunkFileName, chunk.blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      chunk.uploaded = true;
      session.uploadedBytes += chunk.blob.size;
      this.updateProgress(uploadId);

    } catch (error) {
      chunk.retryCount++;
      
      if (chunk.retryCount < this.MAX_RETRIES) {
        // Retry after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000 * chunk.retryCount));
        return this.uploadChunk(uploadId, chunk);
      } else {
        throw new Error(`Failed to upload chunk ${chunk.chunkIndex} after ${this.MAX_RETRIES} retries: ${error}`);
      }
    }
  }

  private static async finalizeUpload(uploadId: string): Promise<void> {
    const session = this.activeSessions.get(uploadId);
    if (!session) return;

    try {
      // Create a combined file by downloading and merging chunks
      const chunkBlobs: Blob[] = [];
      
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkFileName = `${session.fileName}.chunk.${i}`;
        const { data, error } = await supabase.storage
          .from('media-assets')
          .download(chunkFileName);
        
        if (error) throw error;
        chunkBlobs.push(data);
      }

      // Combine all chunks into final file
      const finalBlob = new Blob(chunkBlobs, { type: session.file.type });
      
      // Upload the final combined file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(session.fileName, finalBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Clean up chunk files
      await this.cleanupChunks(uploadId);

      // Create database record
      const mediaAsset = await this.createMediaAssetRecord(session);

      session.status = 'completed';
      session.options.onComplete(mediaAsset);
      this.updateProgress(uploadId);

      // Clean up session
      this.activeSessions.delete(uploadId);

    } catch (error) {
      throw new Error(`Failed to finalize upload: ${error}`);
    }
  }

  private static async createMediaAssetRecord(session: UploadSession): Promise<MediaAsset> {
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media-assets')
      .getPublicUrl(session.fileName);

    // Create media asset record in database
    const mediaAsset: Inserts<'media_assets'> = {
      user_id: session.userId,
      file_name: session.file.name,
      file_path: session.fileName,
      file_size: session.file.size,
      file_type: session.file.type.startsWith('image/') ? 'image' : 'video',
      mime_type: session.file.type,
      dimensions: session.validation.dimensions!,
      duration: session.validation.duration ? Math.round(session.validation.duration) : undefined,
      status: 'processing',
      metadata: {
        originalName: session.file.name,
        uploadedAt: new Date().toISOString(),
        publicUrl: urlData.publicUrl,
        uploadMethod: 'chunked',
        uploadTime: Date.now() - session.startTime
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
  }

  private static async cleanupChunks(uploadId: string): Promise<void> {
    const session = this.activeSessions.get(uploadId);
    if (!session) return;

    try {
      const chunkFilenames = session.chunks.map((_, index) => 
        `${session.fileName}.chunk.${index}`
      );

      await supabase.storage
        .from('media-assets')
        .remove(chunkFilenames);
    } catch (error) {
      console.warn('Failed to cleanup chunk files:', error);
      // Don't throw error for cleanup failures
    }
  }

  private static updateProgress(uploadId: string): void {
    const session = this.activeSessions.get(uploadId);
    if (!session) return;

    const now = Date.now();
    const timeElapsed = (now - session.lastProgressTime) / 1000;
    const bytesUploaded = session.uploadedBytes;
    const percentage = (bytesUploaded / session.file.size) * 100;
    const speed = timeElapsed > 0 ? bytesUploaded / ((now - session.startTime) / 1000) : 0;
    const remainingBytes = session.file.size - bytesUploaded;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    const progress: ChunkUploadProgress = {
      uploadId,
      fileName: session.file.name,
      totalChunks: session.totalChunks,
      uploadedChunks: session.chunks.filter(c => c.uploaded).length,
      totalSize: session.file.size,
      uploadedSize: bytesUploaded,
      percentage: Math.round(percentage * 100) / 100,
      speed: Math.round(speed),
      remainingTime: Math.round(remainingTime),
      status: session.status,
      error: session.status === 'error' ? 'Upload failed' : undefined
    };

    session.options.onProgress(progress);
    session.lastProgressTime = now;
  }

  static pauseUpload(uploadId: string): void {
    const session = this.activeSessions.get(uploadId);
    if (session && session.status === 'uploading') {
      session.status = 'paused';
      this.updateProgress(uploadId);
    }
  }

  static resumeUpload(uploadId: string): void {
    const session = this.activeSessions.get(uploadId);
    if (session && session.status === 'paused') {
      session.status = 'uploading';
      this.processUpload(uploadId);
    }
  }

  static cancelUpload(uploadId: string): void {
    const session = this.activeSessions.get(uploadId);
    if (session) {
      session.status = 'cancelled';
      this.cleanupChunks(uploadId);
      this.activeSessions.delete(uploadId);
      this.updateProgress(uploadId);
    }
  }

  static getUploadProgress(uploadId: string): ChunkUploadProgress | null {
    const session = this.activeSessions.get(uploadId);
    if (!session) return null;

    const bytesUploaded = session.uploadedBytes;
    const percentage = (bytesUploaded / session.file.size) * 100;
    const speed = (Date.now() - session.startTime) / 1000 > 0 ? 
      bytesUploaded / ((Date.now() - session.startTime) / 1000) : 0;
    const remainingBytes = session.file.size - bytesUploaded;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    return {
      uploadId,
      fileName: session.file.name,
      totalChunks: session.totalChunks,
      uploadedChunks: session.chunks.filter(c => c.uploaded).length,
      totalSize: session.file.size,
      uploadedSize: bytesUploaded,
      percentage: Math.round(percentage * 100) / 100,
      speed: Math.round(speed),
      remainingTime: Math.round(remainingTime),
      status: session.status
    };
  }

  private static generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  static async checkStorageAccess(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from('media-assets')
        .list('', { limit: 1 });
      
      return !error;
    } catch {
      return false;
    }
  }
}
