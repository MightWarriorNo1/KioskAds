import React from 'react';
import { 
  Upload, 
  Pause, 
  Play, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Trash2,
  RotateCcw,
  Zap,
  FileText,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { QueuedUpload } from '../../services/uploadQueueService';
import { useUploadQueue } from '../../hooks/useUploadQueue';

interface UploadQueueProps {
  className?: string;
  showCompleted?: boolean;
  maxHeight?: string;
}

export const UploadQueue: React.FC<UploadQueueProps> = ({
  className = '',
  showCompleted = true,
  maxHeight = 'max-h-96'
}) => {
  const {
    queue,
    queuedCount,
    activeCount,
    completedCount,
    errorCount,
    totalSize,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    removeFromQueue,
    clearCompleted,
    getEstimatedWaitTime,
    formatFileSize,
    formatTime
  } = useUploadQueue({
    maxConcurrentUploads: 2,
    prioritizeSmallFiles: true
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="w-4 h-4 text-purple-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getStatusIcon = (upload: QueuedUpload) => {
    switch (upload.status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-orange-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QueuedUpload['status']) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (upload: QueuedUpload) => {
    switch (upload.status) {
      case 'queued':
        const waitTime = getEstimatedWaitTime(upload.id);
        return waitTime > 0 ? `Queued (${formatTime(waitTime)} wait)` : 'Starting soon...';
      case 'uploading':
        return 'Uploading...';
      case 'completed':
        const uploadTime = upload.completedAt && upload.startedAt ? 
          upload.completedAt - upload.startedAt : 0;
        return `Completed in ${formatTime(uploadTime)}`;
      case 'error':
        return upload.error || 'Upload failed';
      case 'paused':
        return 'Paused';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown status';
    }
  };

  const filteredQueue = showCompleted ? queue : queue.filter(u => u.status !== 'completed');

  if (queue.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 text-center ${className}`}>
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No uploads in queue</p>
        <p className="text-sm text-gray-400 mt-1">
          Files will appear here when you start uploading
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Upload Queue</h3>
          </div>
          
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear completed
            </button>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
          <span className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{queuedCount} queued</span>
          </span>
          <span className="flex items-center space-x-1">
            <Upload className="w-4 h-4" />
            <span>{activeCount} uploading</span>
          </span>
          <span className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>{completedCount} completed</span>
          </span>
          {errorCount > 0 && (
            <span className="flex items-center space-x-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{errorCount} failed</span>
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          Total size: {formatFileSize(totalSize)}
        </div>
      </div>

      {/* Queue Items */}
      <div className={`${maxHeight} overflow-y-auto`}>
        <div className="divide-y divide-gray-100">
          {filteredQueue.map((upload) => (
            <div key={upload.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(upload.file)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate" title={upload.file.name}>
                        {upload.file.name}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                        {upload.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(upload.file.size)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Priority: {upload.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getStatusText(upload)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  {getStatusIcon(upload)}
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1 ml-2">
                    {upload.status === 'uploading' && (
                      <button
                        onClick={() => pauseUpload(upload.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Pause upload"
                      >
                        <Pause className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                    
                    {upload.status === 'paused' && (
                      <button
                        onClick={() => resumeUpload(upload.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Resume upload"
                      >
                        <Play className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                    
                    {upload.status === 'error' && (
                      <button
                        onClick={() => retryUpload(upload.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                    
                    {['queued', 'uploading', 'paused'].includes(upload.status) && (
                      <button
                        onClick={() => cancelUpload(upload.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Cancel upload"
                      >
                        <X className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                    
                    {['completed', 'error', 'cancelled'].includes(upload.status) && (
                      <button
                        onClick={() => removeFromQueue(upload.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3 h-3 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {upload.status === 'error' && upload.error && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                  {upload.error}
                </div>
              )}

              {/* Success message */}
              {upload.status === 'completed' && upload.mediaAsset && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                  Successfully uploaded to media library
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadQueue;
