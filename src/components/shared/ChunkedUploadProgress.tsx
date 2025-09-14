import React from 'react';
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Upload,
  Clock,
  Zap,
  HardDrive
} from 'lucide-react';
import { ChunkUploadProgress } from '../../services/chunkedUploadService';

interface ChunkedUploadProgressProps {
  progress: ChunkUploadProgress;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  formatFileSize: (bytes: number) => string;
  formatTime: (seconds: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  className?: string;
}

export const ChunkedUploadProgress: React.FC<ChunkedUploadProgressProps> = ({
  progress,
  onPause,
  onResume,
  onCancel,
  onRetry,
  formatFileSize,
  formatTime,
  formatSpeed,
  className = ''
}) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'preparing':
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500 animate-bounce" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'preparing':
      case 'uploading':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'preparing':
        return 'Preparing upload...';
      case 'uploading':
        return 'Uploading';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Upload completed';
      case 'error':
        return 'Upload failed';
      case 'cancelled':
        return 'Upload cancelled';
      default:
        return 'Unknown status';
    }
  };

  const canPause = progress.status === 'uploading';
  const canResume = progress.status === 'paused';
  const canCancel = ['preparing', 'uploading', 'paused'].includes(progress.status);
  const canRetry = progress.status === 'error';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-gray-900 truncate max-w-xs" title={progress.fileName}>
              {progress.fileName}
            </h3>
            <p className="text-sm text-gray-500">{getStatusText()}</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {canPause && onPause && (
            <button
              onClick={onPause}
              className="p-1.5 rounded-md bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors"
              title="Pause upload"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          
          {canResume && onResume && (
            <button
              onClick={onResume}
              className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Resume upload"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Retry
            </button>
          )}
          
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress.status !== 'completed' && progress.status !== 'cancelled' && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">
              {progress.percentage.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">
              {formatFileSize(progress.uploadedSize)} / {formatFileSize(progress.totalSize)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>
          
          {/* Chunk progress indicator */}
          {progress.totalChunks > 1 && (
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>
                Chunks: {progress.uploadedChunks} / {progress.totalChunks}
              </span>
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(progress.totalChunks, 20) }, (_, i) => {
                  const chunkIndex = Math.floor((i / 20) * progress.totalChunks);
                  const isUploaded = chunkIndex < progress.uploadedChunks;
                  return (
                    <div
                      key={i}
                      className={`w-1 h-2 rounded-sm ${
                        isUploaded ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {(progress.status === 'uploading' || progress.status === 'paused') && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-gray-500">Speed</p>
              <p className="font-medium">{formatSpeed(progress.speed)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-gray-500">Remaining</p>
              <p className="font-medium">{formatTime(progress.remainingTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-gray-500">Size</p>
              <p className="font-medium">{formatFileSize(progress.totalSize)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">Upload completed successfully!</p>
              <p className="text-xs text-green-600">
                {formatFileSize(progress.totalSize)} uploaded in {progress.totalChunks} chunks
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {progress.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-800">Upload failed</p>
              {progress.error && (
                <p className="text-xs text-red-600 mt-1">{progress.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChunkedUploadProgress;
