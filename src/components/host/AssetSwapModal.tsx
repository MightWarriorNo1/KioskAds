import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService } from '../../services/hostService';
import { MediaService } from '../../services/mediaService';
import { validateFile } from '../../utils/fileValidation';
import Button from '../ui/Button';

interface AssetSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetType: 'host_ad' | 'media_asset';
  currentAsset: {
    name: string;
    media_url: string;
    media_type: 'image' | 'video';
    duration?: number;
  };
  onSwapComplete: () => void;
}

export default function AssetSwapModal({
  isOpen,
  onClose,
  assetId,
  assetType,
  currentAsset,
  onSwapComplete
}: AssetSwapModalProps) {
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDuration, setNewDuration] = useState<number>(currentAsset.duration || 15);
  const [uploading, setUploading] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotification();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate the file
      const validationResult = await validateFile(file, {
        maxVideoDuration: 60 // Allow up to 60 seconds for swapped assets
      });

      if (!validationResult.isValid) {
        addNotification('error', 'Invalid File', validationResult.errors.join(', '));
        return;
      }

      setNewFile(file);
      setValidation(validationResult);
      
      // Auto-set duration for videos
      if (validationResult.duration) {
        setNewDuration(Math.round(validationResult.duration));
      }
    } catch (error) {
      console.error('File validation error:', error);
      addNotification('error', 'Validation Error', 'Failed to validate file');
    }
  };

  const handleSwap = async () => {
    if (!newFile || !validation) {
      addNotification('error', 'No File Selected', 'Please select a new asset file');
      return;
    }

    setUploading(true);
    try {
      if (assetType === 'host_ad') {
        // For host ads, we need to upload the file first and get the URL
        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        // Upload to storage (this would need to be implemented in HostService)
        // For now, we'll use a placeholder approach
        const newMediaUrl = URL.createObjectURL(newFile); // Temporary URL for demo
        
        await HostService.swapAdAsset(
          assetId,
          newMediaUrl,
          newFile.type.startsWith('image/') ? 'image' : 'video',
          newDuration
        );
      } else {
        // For media assets
        await MediaService.swapMediaAsset(assetId, newFile, validation);
      }

      addNotification('success', 'Asset Swapped', 'Your asset has been swapped and is pending admin review');
      onSwapComplete();
      onClose();
    } catch (error) {
      console.error('Asset swap error:', error);
      addNotification('error', 'Swap Failed', error instanceof Error ? error.message : 'Failed to swap asset');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (assetType === 'host_ad') {
      await HostService.submitSwappedAdForReview(assetId);
    } else {
      await MediaService.submitSwappedMediaForReview(assetId);
    }
    
    addNotification('success', 'Submitted for Review', 'Your swapped asset has been submitted for admin review');
    onSwapComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Swap Asset
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Asset
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentAsset.name} ({currentAsset.media_type})
              </p>
              {currentAsset.duration && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Duration: {currentAsset.duration}s
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Asset File
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center py-4"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select new file
                </p>
              </button>
            </div>
            {newFile && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="text-sm text-green-800 dark:text-green-400">
                  Selected: {newFile.name}
                </p>
                {validation?.duration && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Duration: {Math.round(validation.duration)}s
                  </p>
                )}
              </div>
            )}
          </div>

          {newFile && newFile.type.startsWith('video/') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-400">
              <p className="font-medium">Important:</p>
              <p>After swapping, your asset will need admin approval before becoming active again.</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          {newFile ? (
            <Button
              onClick={handleSwap}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? 'Swapping...' : 'Swap Asset'}
            </Button>
          ) : (
            <Button
              onClick={handleSubmitForReview}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
