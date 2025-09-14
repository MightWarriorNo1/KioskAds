import { ChunkedUploadService, ChunkUploadOptions } from './chunkedUploadService';
import { validateFile, ValidationResult } from '../utils/fileValidation';
import { supabase } from '../lib/supabaseClient';
import { MediaAsset } from '../types/database';

export interface QueuedUpload {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'paused' | 'cancelled';
  uploadId?: string;
  mediaAsset?: MediaAsset;
  error?: string;
  priority: number; // Higher number = higher priority
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface UploadQueueOptions {
  maxConcurrentUploads?: number;
  autoStart?: boolean;
  prioritizeSmallFiles?: boolean;
  chunkSize?: number;
  maxConcurrentChunks?: number;
}

export class UploadQueueService {
  private static instance: UploadQueueService;
  private queue: QueuedUpload[] = [];
  private activeUploads = new Map<string, string>(); // queueId -> uploadId
  private options: Required<UploadQueueOptions>;
  private listeners = new Map<string, (upload: QueuedUpload) => void>();
  private queueListeners = new Set<(queue: QueuedUpload[]) => void>();

  private constructor(options: UploadQueueOptions = {}) {
    this.options = {
      maxConcurrentUploads: 2, // Conservative for stability
      autoStart: true,
      prioritizeSmallFiles: true,
      chunkSize: 2 * 1024 * 1024, // 2MB
      maxConcurrentChunks: 3,
      ...options
    };
  }

  static getInstance(options?: UploadQueueOptions): UploadQueueService {
    if (!UploadQueueService.instance) {
      UploadQueueService.instance = new UploadQueueService(options);
    }
    return UploadQueueService.instance;
  }

  async addToQueue(
    file: File, 
    priority: number = 0,
    onProgress?: (upload: QueuedUpload) => void
  ): Promise<string> {
    const queueId = this.generateQueueId();
    
    // Calculate priority based on file size if enabled
    let finalPriority = priority;
    if (this.options.prioritizeSmallFiles) {
      // Smaller files get higher priority (inverse of size)
      const sizePriority = Math.max(0, 100 - Math.floor(file.size / (1024 * 1024)));
      finalPriority += sizePriority;
    }

    const queuedUpload: QueuedUpload = {
      id: queueId,
      file,
      status: 'queued',
      priority: finalPriority,
      addedAt: Date.now()
    };

    this.queue.push(queuedUpload);
    
    // Sort queue by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    if (onProgress) {
      this.listeners.set(queueId, onProgress);
    }

    this.notifyQueueListeners();

    if (this.options.autoStart) {
      this.processQueue();
    }

    return queueId;
  }

  private async processQueue(): Promise<void> {
    const activeCount = this.activeUploads.size;
    const availableSlots = this.options.maxConcurrentUploads - activeCount;
    
    if (availableSlots <= 0) return;

    const queuedUploads = this.queue
      .filter(upload => upload.status === 'queued')
      .slice(0, availableSlots);

    for (const upload of queuedUploads) {
      this.startUpload(upload);
    }
  }

  private async startUpload(upload: QueuedUpload): Promise<void> {
    try {
      upload.status = 'uploading';
      upload.startedAt = Date.now();
      this.notifyListener(upload);
      this.notifyQueueListeners();

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      // Validate file
      const validation = await validateFile(upload.file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Determine chunk size based on file size
      const chunkSize = upload.file.size > 50 * 1024 * 1024 ? 
        5 * 1024 * 1024 : // 5MB for large files
        this.options.chunkSize; // Default for smaller files

      // Start chunked upload
      const uploadId = await ChunkedUploadService.startUpload(
        upload.file,
        validation,
        userData.user.id,
        {
          chunkSize,
          maxConcurrentChunks: this.options.maxConcurrentChunks,
          onProgress: (progress) => {
            // Update upload status based on progress
            if (progress.status === 'completed') {
              upload.status = 'completed';
              upload.completedAt = Date.now();
              this.activeUploads.delete(upload.id);
              this.processQueue(); // Start next upload
            } else if (progress.status === 'error') {
              upload.status = 'error';
              upload.error = progress.error;
              this.activeUploads.delete(upload.id);
              this.processQueue(); // Start next upload
            } else if (progress.status === 'paused') {
              upload.status = 'paused';
            }
            
            this.notifyListener(upload);
            this.notifyQueueListeners();
          },
          onComplete: (mediaAsset) => {
            upload.mediaAsset = mediaAsset;
            upload.status = 'completed';
            upload.completedAt = Date.now();
            this.activeUploads.delete(upload.id);
            this.notifyListener(upload);
            this.notifyQueueListeners();
            this.processQueue(); // Start next upload
          },
          onError: (error) => {
            upload.status = 'error';
            upload.error = error.message;
            this.activeUploads.delete(upload.id);
            this.notifyListener(upload);
            this.notifyQueueListeners();
            this.processQueue(); // Start next upload
          }
        }
      );

      upload.uploadId = uploadId;
      this.activeUploads.set(upload.id, uploadId);

    } catch (error) {
      upload.status = 'error';
      upload.error = error instanceof Error ? error.message : 'Upload failed';
      this.notifyListener(upload);
      this.notifyQueueListeners();
      this.processQueue(); // Start next upload
    }
  }

  pauseUpload(queueId: string): void {
    const upload = this.queue.find(u => u.id === queueId);
    if (upload && upload.uploadId) {
      ChunkedUploadService.pauseUpload(upload.uploadId);
      upload.status = 'paused';
      this.notifyListener(upload);
      this.notifyQueueListeners();
    }
  }

  resumeUpload(queueId: string): void {
    const upload = this.queue.find(u => u.id === queueId);
    if (upload && upload.uploadId) {
      ChunkedUploadService.resumeUpload(upload.uploadId);
      upload.status = 'uploading';
      this.notifyListener(upload);
      this.notifyQueueListeners();
    }
  }

  cancelUpload(queueId: string): void {
    const upload = this.queue.find(u => u.id === queueId);
    if (upload) {
      if (upload.uploadId) {
        ChunkedUploadService.cancelUpload(upload.uploadId);
        this.activeUploads.delete(queueId);
      }
      
      upload.status = 'cancelled';
      this.notifyListener(upload);
      this.notifyQueueListeners();
      
      // Start next upload if this was active
      if (upload.uploadId) {
        this.processQueue();
      }
    }
  }

  removeFromQueue(queueId: string): void {
    this.cancelUpload(queueId);
    this.queue = this.queue.filter(u => u.id !== queueId);
    this.listeners.delete(queueId);
    this.notifyQueueListeners();
  }

  retryUpload(queueId: string): void {
    const upload = this.queue.find(u => u.id === queueId);
    if (upload && upload.status === 'error') {
      upload.status = 'queued';
      upload.error = undefined;
      upload.uploadId = undefined;
      upload.startedAt = undefined;
      upload.completedAt = undefined;
      
      // Re-sort queue
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.notifyListener(upload);
      this.notifyQueueListeners();
      
      if (this.options.autoStart) {
        this.processQueue();
      }
    }
  }

  getQueue(): QueuedUpload[] {
    return [...this.queue];
  }

  getQueuedCount(): number {
    return this.queue.filter(u => u.status === 'queued').length;
  }

  getActiveCount(): number {
    return this.activeUploads.size;
  }

  getCompletedCount(): number {
    return this.queue.filter(u => u.status === 'completed').length;
  }

  getErrorCount(): number {
    return this.queue.filter(u => u.status === 'error').length;
  }

  clearCompleted(): void {
    const completedIds = this.queue
      .filter(u => u.status === 'completed')
      .map(u => u.id);
    
    completedIds.forEach(id => {
      this.listeners.delete(id);
    });
    
    this.queue = this.queue.filter(u => u.status !== 'completed');
    this.notifyQueueListeners();
  }

  onQueueChange(listener: (queue: QueuedUpload[]) => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  private notifyListener(upload: QueuedUpload): void {
    const listener = this.listeners.get(upload.id);
    if (listener) {
      listener(upload);
    }
  }

  private notifyQueueListeners(): void {
    const queue = this.getQueue();
    this.queueListeners.forEach(listener => listener(queue));
  }

  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods
  getTotalQueueSize(): number {
    return this.queue.reduce((total, upload) => total + upload.file.size, 0);
  }

  getAverageWaitTime(): number {
    const completedUploads = this.queue.filter(u => u.status === 'completed' && u.startedAt);
    if (completedUploads.length === 0) return 0;
    
    const totalWaitTime = completedUploads.reduce((total, upload) => {
      return total + (upload.startedAt! - upload.addedAt);
    }, 0);
    
    return totalWaitTime / completedUploads.length;
  }

  getEstimatedWaitTime(queueId: string): number {
    const upload = this.queue.find(u => u.id === queueId);
    if (!upload || upload.status !== 'queued') return 0;
    
    const position = this.queue
      .filter(u => u.status === 'queued')
      .findIndex(u => u.id === queueId);
    
    const averageUploadTime = this.getAverageUploadTime();
    const availableSlots = this.options.maxConcurrentUploads - this.activeUploads.size;
    
    if (position < availableSlots) return 0; // Will start immediately
    
    const queuePosition = position - availableSlots;
    return (queuePosition / this.options.maxConcurrentUploads) * averageUploadTime;
  }

  private getAverageUploadTime(): number {
    const completedUploads = this.queue.filter(u => 
      u.status === 'completed' && u.startedAt && u.completedAt
    );
    
    if (completedUploads.length === 0) return 60000; // Default 1 minute
    
    const totalUploadTime = completedUploads.reduce((total, upload) => {
      return total + (upload.completedAt! - upload.startedAt!);
    }, 0);
    
    return totalUploadTime / completedUploads.length;
  }
}
