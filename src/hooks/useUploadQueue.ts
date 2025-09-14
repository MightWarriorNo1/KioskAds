import { useState, useEffect, useCallback } from 'react';
import { UploadQueueService, QueuedUpload, UploadQueueOptions } from '../services/uploadQueueService';

export interface UseUploadQueueReturn {
  queue: QueuedUpload[];
  queuedCount: number;
  activeCount: number;
  completedCount: number;
  errorCount: number;
  totalSize: number;
  averageWaitTime: number;
  
  // Actions
  addFiles: (files: File[], priority?: number) => Promise<string[]>;
  pauseUpload: (queueId: string) => void;
  resumeUpload: (queueId: string) => void;
  cancelUpload: (queueId: string) => void;
  retryUpload: (queueId: string) => void;
  removeFromQueue: (queueId: string) => void;
  clearCompleted: () => void;
  
  // Utilities
  getEstimatedWaitTime: (queueId: string) => number;
  formatFileSize: (bytes: number) => string;
  formatTime: (ms: number) => string;
  getUploadById: (queueId: string) => QueuedUpload | undefined;
}

export const useUploadQueue = (options?: UploadQueueOptions): UseUploadQueueReturn => {
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [queueService] = useState(() => UploadQueueService.getInstance(options));

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueService.onQueueChange((newQueue) => {
      setQueue(newQueue);
    });

    // Initial load
    setQueue(queueService.getQueue());

    return unsubscribe;
  }, [queueService]);

  const addFiles = useCallback(async (files: File[], priority: number = 0): Promise<string[]> => {
    const queueIds: string[] = [];
    
    for (const file of files) {
      const queueId = await queueService.addToQueue(file, priority);
      queueIds.push(queueId);
    }
    
    return queueIds;
  }, [queueService]);

  const pauseUpload = useCallback((queueId: string) => {
    queueService.pauseUpload(queueId);
  }, [queueService]);

  const resumeUpload = useCallback((queueId: string) => {
    queueService.resumeUpload(queueId);
  }, [queueService]);

  const cancelUpload = useCallback((queueId: string) => {
    queueService.cancelUpload(queueId);
  }, [queueService]);

  const retryUpload = useCallback((queueId: string) => {
    queueService.retryUpload(queueId);
  }, [queueService]);

  const removeFromQueue = useCallback((queueId: string) => {
    queueService.removeFromQueue(queueId);
  }, [queueService]);

  const clearCompleted = useCallback(() => {
    queueService.clearCompleted();
  }, [queueService]);

  const getEstimatedWaitTime = useCallback((queueId: string): number => {
    return queueService.getEstimatedWaitTime(queueId);
  }, [queueService]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTime = useCallback((ms: number): string => {
    if (!ms || ms < 1000) return '< 1s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const getUploadById = useCallback((queueId: string): QueuedUpload | undefined => {
    return queue.find(upload => upload.id === queueId);
  }, [queue]);

  return {
    queue,
    queuedCount: queueService.getQueuedCount(),
    activeCount: queueService.getActiveCount(),
    completedCount: queueService.getCompletedCount(),
    errorCount: queueService.getErrorCount(),
    totalSize: queueService.getTotalQueueSize(),
    averageWaitTime: queueService.getAverageWaitTime(),
    
    // Actions
    addFiles,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    removeFromQueue,
    clearCompleted,
    
    // Utilities
    getEstimatedWaitTime,
    formatFileSize,
    formatTime,
    getUploadById
  };
};

export default useUploadQueue;
