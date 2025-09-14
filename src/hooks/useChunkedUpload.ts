import { useState, useCallback, useRef } from 'react';
import { ChunkedUploadService, ChunkUploadProgress, ChunkUploadOptions } from '../services/chunkedUploadService';
import { validateFile, ValidationResult } from '../utils/fileValidation';
import { supabase } from '../lib/supabaseClient';
import { MediaAsset } from '../types/database';

export interface UploadState {
  isUploading: boolean;
  progress: ChunkUploadProgress | null;
  error: string | null;
  mediaAsset: MediaAsset | null;
}

export interface UseChunkedUploadOptions extends Omit<ChunkUploadOptions, 'onProgress' | 'onComplete' | 'onError'> {
  autoStart?: boolean;
  validateBeforeUpload?: boolean;
}

export const useChunkedUpload = (options: UseChunkedUploadOptions = {}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    mediaAsset: null
  });

  const currentUploadId = useRef<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: null,
      error: null,
      mediaAsset: null
    });
    currentUploadId.current = null;
    abortController.current = null;
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<MediaAsset | null> => {
    try {
      // Reset previous state
      resetState();
      setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      const userId = userData.user.id;

      // Validate file if enabled
      let validation: ValidationResult;
      if (options.validateBeforeUpload !== false) {
        validation = await validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      } else {
        // Basic validation for required fields
        validation = {
          isValid: true,
          errors: [],
          dimensions: { width: 1080, height: 1920 }, // Default for now
          duration: file.type.startsWith('video/') ? 10 : undefined // Default integer seconds
        };
      }

      // Create abort controller for this upload
      abortController.current = new AbortController();

      // Start chunked upload
      const uploadId = await ChunkedUploadService.startUpload(
        file,
        validation,
        userId,
        {
          ...options,
          onProgress: (progress) => {
            setUploadState(prev => ({ ...prev, progress }));
          },
          onComplete: (mediaAsset) => {
            setUploadState(prev => ({
              ...prev,
              isUploading: false,
              mediaAsset,
              progress: { ...prev.progress!, status: 'completed', percentage: 100 }
            }));
          },
          onError: (error) => {
            setUploadState(prev => ({
              ...prev,
              isUploading: false,
              error: error.message,
              progress: prev.progress ? { ...prev.progress, status: 'error' } : null
            }));
          }
        }
      );

      currentUploadId.current = uploadId;

      // Return a promise that resolves when upload completes
      return new Promise((resolve, reject) => {
        const checkStatus = () => {
          const progress = ChunkedUploadService.getUploadProgress(uploadId);
          if (!progress) {
            reject(new Error('Upload session not found'));
            return;
          }

          if (progress.status === 'completed') {
            resolve(uploadState.mediaAsset);
          } else if (progress.status === 'error' || progress.status === 'cancelled') {
            reject(new Error(progress.error || 'Upload failed'));
          } else {
            setTimeout(checkStatus, 500);
          }
        };

        checkStatus();
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [options, uploadState.mediaAsset, resetState]);

  const pauseUpload = useCallback(() => {
    if (currentUploadId.current) {
      ChunkedUploadService.pauseUpload(currentUploadId.current);
    }
  }, []);

  const resumeUpload = useCallback(() => {
    if (currentUploadId.current) {
      ChunkedUploadService.resumeUpload(currentUploadId.current);
    }
  }, []);

  const cancelUpload = useCallback(() => {
    if (currentUploadId.current) {
      ChunkedUploadService.cancelUpload(currentUploadId.current);
      currentUploadId.current = null;
    }
    if (abortController.current) {
      abortController.current.abort();
    }
    resetState();
  }, [resetState]);

  const retryUpload = useCallback(async (file: File) => {
    if (uploadState.error) {
      return uploadFile(file);
    }
  }, [uploadFile, uploadState.error]);

  // Format helper functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || seconds === Infinity) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatSpeed = useCallback((bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  }, [formatFileSize]);

  return {
    // State
    ...uploadState,
    
    // Actions
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    resetState,
    
    // Helpers
    formatFileSize,
    formatTime,
    formatSpeed,
    
    // Computed values
    canPause: uploadState.isUploading && uploadState.progress?.status === 'uploading',
    canResume: uploadState.progress?.status === 'paused',
    canCancel: uploadState.isUploading || uploadState.progress?.status === 'paused',
    canRetry: !!uploadState.error,
    
    // Progress details
    progressPercentage: uploadState.progress?.percentage || 0,
    uploadSpeed: uploadState.progress?.speed || 0,
    remainingTime: uploadState.progress?.remainingTime || 0,
    uploadedSize: uploadState.progress?.uploadedSize || 0,
    totalSize: uploadState.progress?.totalSize || 0,
    uploadedChunks: uploadState.progress?.uploadedChunks || 0,
    totalChunks: uploadState.progress?.totalChunks || 0
  };
};

export default useChunkedUpload;
