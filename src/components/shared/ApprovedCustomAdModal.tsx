import React, { useState, useEffect } from 'react';
import { X, Image, Video, Calendar, FileText, CheckCircle } from 'lucide-react';
import { CustomAdsService } from '../../services/customAdsService';
import KioskPreview from '../admin/KioskPreview';
import { debugCustomAds } from '../../utils/debugCustomAds';

interface ApprovedCustomAd {
  id: string;
  orderId: string;
  proofId: string;
  title: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
  versionNumber: number;
}

interface ApprovedCustomAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customAd: ApprovedCustomAd) => void;
  userId: string;
}

export default function ApprovedCustomAdModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  userId 
}: ApprovedCustomAdModalProps) {
  const [customAds, setCustomAds] = useState<ApprovedCustomAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<ApprovedCustomAd | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadCustomAds();
    }
  }, [isOpen, userId]);

  const loadCustomAds = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading custom ads for user:', userId);
      
      // Run debug function first
      await debugCustomAds(userId);
      
      const ads = await CustomAdsService.getUserApprovedCustomAdMedia(userId);
      console.log('Loaded custom ads:', ads);
      setCustomAds(ads);
    } catch (err) {
      console.error('Error loading custom ads:', err);
      setError('Failed to load approved custom ads');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedAd) {
      onSelect(selectedAd);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Select Approved Custom Ad
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Choose from your approved custom ad designs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading approved custom ads...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadCustomAds}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : customAds.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2">No approved custom ads found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                You need to have approved custom ad designs to use this option.
              </p>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                <p>To get approved custom ads:</p>
                <p>1. Submit a custom ad order</p>
                <p>2. Wait for designer to create proofs</p>
                <p>3. Approve the designs</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customAds.map((ad) => (
                <div
                  key={ad.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedAd?.id === ad.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedAd(ad)}
                >
                  <div className="space-y-3">
                    {/* Preview */}
                    <div className="flex justify-center">
                      <KioskPreview
                        mediaUrl={ad.url}
                        mediaType={ad.type === 'video' ? 'video' : 'image'}
                        title={ad.title}
                        className="w-32 h-48"
                      />
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {ad.type === 'video' ? (
                          <Video className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Image className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {ad.title}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{ad.fileName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(ad.createdAt)}</span>
                        </div>
                        <div>Size: {formatFileSize(ad.size)}</div>
                        <div>Version: {ad.versionNumber}</div>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {selectedAd?.id === ad.id && (
                      <div className="flex items-center justify-center space-x-2 text-blue-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {customAds.length > 0 && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedAd}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedAd
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Use Selected Ad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
