import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertTriangle,  CheckSquare } from 'lucide-react';
import { MediaService } from '../../services/mediaService';
import { useAuth } from '../../contexts/AuthContext';
import { validateFile } from '../../utils/fileValidation';
import KioskPreview from '../../components/admin/KioskPreview';
import ApprovedCustomAdModal from '../../components/shared/ApprovedCustomAdModal';

interface SelectedWeek {
  startDate: string;
  endDate: string;
  slots: number;
}

interface CampaignData {
  kiosk: any;
  kiosks?: any[];
  selectedWeeks: SelectedWeek[];
  totalSlots: number;
  baseRate: number;
  subscriptionDuration?: number; // 1, 3, or 6 months
  useCustomAd?: boolean;
}

export default function HostAddMediaDurationPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: CampaignData };
  const { user } = useAuth();
  
  const campaignData = location.state;
  
  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!campaignData) {
      navigate('/host/new-campaign');
      return;
    }
  }, [campaignData, user, navigate]);
  
  if (!campaignData || !user) {
    return null;
  }
  
  const kiosk = campaignData.kiosk;
  const kiosks = campaignData.kiosks || (campaignData.kiosk ? [campaignData.kiosk] : []);
  const subscriptionDuration = campaignData.subscriptionDuration || 1; // Default to 1 month if not provided
  const useCustomAd = campaignData.useCustomAd;

  const [slotsPerWeek, setSlotsPerWeek] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [fileValidation, setFileValidation] = useState<any>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(4 * 60 + 56);
  const [showConfig, setShowConfig] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [showCustomAdModal, setShowCustomAdModal] = useState(false);
  const [selectedCustomAdForCampaign, setSelectedCustomAdForCampaign] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectCustomAd = () => {
    if (user?.id) {
      setShowCustomAdModal(true);
    }
  };

  const handleCustomAdSelected = (customAd: any) => {
    setSelectedCustomAdForCampaign(customAd);
    setShowCustomAdModal(false);
    
    // Set the preview and file information for display
    setFilePreview(customAd.url);
    
    // Create a mock File object for the uploadedFile state to display file info
    const mockFile = {
      name: customAd.fileName || customAd.title,
      size: customAd.size || 0,
      type: customAd.type === 'video' ? 'video/mp4' : 'image/jpeg'
    } as File;
    
    setUploadedFile(mockFile);
    setShowConfig(true);
  };

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Select Subscription', current: false, completed: true },
    { number: 4, name: 'Add Media & Duration', current: true, completed: false },
    { number: 5, name: 'Review & Submit', current: false, completed: false }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setUploadError(null);
    setFileValidationError(null);
    setFileValidation(null);

    try {
      // Use comprehensive validation like client
      const validation = await validateFile(file);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.join('. ');
        setFileValidationError(errorMessage);
        return;
      }

      // Store validation result
      setFileValidation(validation);

      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setFilePreview(url);
      }
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = 'Failed to validate file. Please try again.';
      setFileValidationError(errorMessage);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile || !user || !fileValidation) return null;
    setIsUploadingToSupabase(true);
    try {
      const uploadedMediaAsset = await MediaService.uploadMedia(uploadedFile, fileValidation, user.id);
      return uploadedMediaAsset;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      setIsUploadingToSupabase(false);
    }
  };

  const canContinue = (uploadedFile && !isUploadingToSupabase && fileValidation && !fileValidationError) || (selectedCustomAdForCampaign && !isUploadingToSupabase);

  return (
    <div>
      {/* Steps */}
      <div className="mb-6 md:mb-8">
        <div className="block md:hidden">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
              steps[3].current 
                ? 'bg-black text-white' 
                : steps[3].completed
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {steps[3].completed ? '✓' : steps[3].number}
            </div>
            <span className={`text-sm font-medium ${
              steps[3].current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {steps[3].name}
            </span>
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            Step 4 of {steps.length}
          </div>
        </div>
      </div>

      {/* Back */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/host/select-weeks', { state: { kiosks, kiosk } })}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Select Subscription</span>
        </button>
      </div>

      {/* Upload & Duration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {useCustomAd ? 'Select Custom Ad' : 'Upload Media'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time remaining: {formatTime(timeRemaining)}</div>
          </div>
          <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
            {useCustomAd ? (
              /* Custom Ad Selection Box */
              <div className="space-y-4">
                {selectedCustomAdForCampaign ? (
                  <div className="space-y-4">
                    {/* Preview */}
                    <div className="flex justify-center">
                      <KioskPreview
                        mediaUrl={selectedCustomAdForCampaign.url}
                        mediaType={selectedCustomAdForCampaign.type === 'video' ? 'video' : 'image'}
                        title={selectedCustomAdForCampaign.title}
                        className="w-48 h-96"
                      />
                    </div>
                    
                    <div className="text-center">
                      <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {selectedCustomAdForCampaign.title}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Custom ad design ready for deployment
                      </p>
                      {/* Proof Details */}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center mb-2">
                          <CheckSquare className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm text-green-800 dark:text-green-300 font-semibold">
                            Proof {new Date(selectedCustomAdForCampaign.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })}, {new Date(selectedCustomAdForCampaign.createdAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-green-700 dark:text-green-400">
                            Version {selectedCustomAdForCampaign.versionNumber} • Approved
                          </div>
                          {isUploadingToSupabase && (
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                              Creating media asset...
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={handleSelectCustomAd}
                          disabled={isUploadingToSupabase}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Change Selection
                        </button>
                        <button
                          onClick={() => setShowConfig(true)}
                          disabled={isUploadingToSupabase}
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploadingToSupabase ? 'Processing...' : 'Use This Ad'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <CheckSquare className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Select a Custom Ad
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Choose from your approved custom ad designs
                      </p>
                      <button
                        onClick={handleSelectCustomAd}
                        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Browse Custom Ads
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : filePreview ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <KioskPreview
                    mediaUrl={filePreview}
                    mediaType={uploadedFile?.type.startsWith('image/') ? 'image' : 'video'}
                    title={uploadedFile?.name || 'Ad Preview'}
                    className="w-48 h-96"
                  />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 text-center">{uploadedFile?.name}</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto text-gray-400" />
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Drag & drop or choose a file to upload</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 rounded bg-black text-white"
                >
                  Select File
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,video/mp4" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            
            {/* Validation Requirements */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>Supported formats:</strong> JPG, PNG, MP4</p>
              <p><strong>Max sizes:</strong> Images 10MB • Videos 500MB</p>
              <p><strong>Resolution:</strong> 1080×1920 or 2160×3840 (9:16 aspect ratio)</p>
              <p><strong>Video duration:</strong> 15 seconds max</p>
              <p><strong>Validation:</strong> All files are validated for format, size, and dimensions</p>
            </div>
            {fileValidationError && (
              <div className="mt-3 text-red-600 text-sm flex items-center justify-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{fileValidationError}</span>
              </div>
            )}
            {uploadError && (
              <div className="mt-3 text-red-600 text-sm flex items-center justify-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">Ad Duration</div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Slots per month</label>
              <div className="flex items-center space-x-3">
                <button onClick={() => setSlotsPerWeek(Math.max(1, slotsPerWeek-1))} className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700">-</button>
                <div className="w-16 text-center font-semibold">{slotsPerWeek}</div>
                <button onClick={() => setSlotsPerWeek(slotsPerWeek+1)} className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700">+</button>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-3 text-sm flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
              <div>
                Higher durations may require admin approval. Keep media under platform guidelines.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          disabled={!canContinue}
          onClick={async () => {
            let uploadedMediaAsset;
            
            if (selectedCustomAdForCampaign) {
              // Handle custom ad selection - create a media asset from the custom ad
              try {
                setIsUploadingToSupabase(true);
                uploadedMediaAsset = await MediaService.createMediaFromApprovedCustomAd({
                  userId: user.id,
                  sourceId: selectedCustomAdForCampaign.proofId,
                  fileName: selectedCustomAdForCampaign.fileName,
                  publicUrl: selectedCustomAdForCampaign.url,
                  fileSize: selectedCustomAdForCampaign.size,
                  mimeType: selectedCustomAdForCampaign.type === 'video' ? 'video/mp4' : 'image/jpeg',
                  fileType: selectedCustomAdForCampaign.type === 'video' ? 'video' : 'image',
                  dimensions: { width: 1080, height: 1920 } // Default vertical ad dimensions (9:16 aspect ratio)
                });
              } catch (error) {
                console.error('Error creating media asset from custom ad:', error);
                setUploadError('Failed to process custom ad. Please try again.');
                return;
              } finally {
                setIsUploadingToSupabase(false);
              }
            } else {
              // Handle file upload
              uploadedMediaAsset = await handleUpload();
            }
            
            if (!uploadedMediaAsset) return;
            navigate('/host/review-submit', { 
              state: { 
                ...campaignData, 
                slotsPerWeek, 
                uploadedMediaAsset,
                selectedCustomAd: selectedCustomAdForCampaign
              } 
            });
          }}
          className={`px-6 py-3 rounded-xl font-semibold ${canContinue ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
        >
          Continue to Review & Submit
        </button>
      </div>

      {/* Custom Ad Selection Modal */}
      {user?.id && (
        <ApprovedCustomAdModal
          isOpen={showCustomAdModal}
          onClose={() => setShowCustomAdModal(false)}
          onSelect={handleCustomAdSelected}
          userId={user.id}
        />
      )}
    </div>
  );
}


