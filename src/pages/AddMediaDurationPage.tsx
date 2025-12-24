import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertTriangle, Clock, CheckCircle, CheckSquare } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { MediaService } from '../services/mediaService';
import { useAuth } from '../contexts/AuthContext';
import KioskPreview from '../components/admin/KioskPreview';
import ApprovedCustomAdModal from '../components/shared/ApprovedCustomAdModal';

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
  subscriptionDuration?: number; // Custom number of months
  isRecurringSubscription?: boolean; // Recurring monthly subscription
  useCustomAd?: boolean;
}

export default function AddMediaDurationPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: CampaignData };
  const { user } = useAuth();
  
  const campaignData = location.state;
  
  // Redirect if no campaign data or user not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!campaignData) {
      navigate('/client/new-campaign');
      return;
    }
  }, [campaignData, user, navigate]);
  
  if (!campaignData || !user) {
    return null; // Will redirect
  }
  
  const kiosk = campaignData.kiosk;
  const kiosks = campaignData.kiosks || (campaignData.kiosk ? [campaignData.kiosk] : []);
  const selectedWeeks = campaignData.selectedWeeks || [];
  const totalSlots = campaignData.totalSlots || 1;
  const baseRate = campaignData.baseRate || 40.00;
  const subscriptionDuration = campaignData.subscriptionDuration || 1; // Default to 1 month if not provided
  const useCustomAd = campaignData.useCustomAd;

  const [slotsPerWeek, setSlotsPerWeek] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(4 * 60 + 56); // 4:56 in seconds
  const [showConfig, setShowConfig] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [preselectedAsset, setPreselectedAsset] = useState<any | null>(null);
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

  // Countdown timer
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

  // Check storage access on component mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        console.log('Checking storage access...'); // Debug log
        const accessible = await MediaService.checkStorageAccess();
        console.log('Storage accessible:', accessible); // Debug log
      } catch (error) {
        console.error('Storage check failed:', error);
      }
    };
    
    checkStorage();
  }, []);

  // Check for preselected approved custom ad asset
  useEffect(() => {
    (async () => {
      try {
        const id = localStorage.getItem('preselectedMediaAssetId');
        if (id) {
          // Clean the ID to remove any suffixes like _1
          const cleanedId = id.split('_')[0];
          console.log('Loading preselected media asset:', {
            original_id: id,
            cleaned_id: cleanedId
          });
          
          const asset = await MediaService.getMediaById(cleanedId);
          if (asset) {
            setPreselectedAsset(asset);
            setFilePreview(asset.metadata?.publicUrl || null);
            setShowConfig(true);
          }
          // clear so it is used once
          localStorage.removeItem('preselectedMediaAssetId');
        }
      } catch (e) {
        console.warn('Failed to load preselected media asset', e);
      }
    })();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setUploadError(null);
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Helper function to get file dimensions without validation
  const getFileDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          resolve({ width: 1920, height: 1080 }); // Default fallback
        };
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => {
          resolve({ width: 1920, height: 1080 }); // Default fallback
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve({ width: 1920, height: 1080 }); // Default fallback
      }
    });
  };

  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          // Convert to integer seconds for database compatibility
          resolve(Math.round(video.duration));
        };
        video.onerror = () => {
          resolve(undefined);
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleContinue = async () => {
    if ((!uploadedFile && !preselectedAsset && !selectedCustomAdForCampaign) || !user) {
      console.error('Missing media or user:', { uploadedFile: !!uploadedFile, preselectedAsset: !!preselectedAsset, selectedCustomAdForCampaign: !!selectedCustomAdForCampaign, user: !!user });
      return;
    }

    console.log('Starting upload process...');
    setIsUploadingToSupabase(true);
    setUploadError(null);

    try {
      let uploadedMediaAsset = preselectedAsset;
      
      // Handle custom ad selection
      if (selectedCustomAdForCampaign) {
        console.log('Using selected custom ad:', selectedCustomAdForCampaign);
        uploadedMediaAsset = {
          id: selectedCustomAdForCampaign.id,
          url: selectedCustomAdForCampaign.url,
          type: selectedCustomAdForCampaign.type,
          title: selectedCustomAdForCampaign.title,
          fileName: selectedCustomAdForCampaign.fileName,
          size: selectedCustomAdForCampaign.size,
          isCustomAd: true
        };
      } else if (!uploadedMediaAsset && uploadedFile) {
        console.log('Getting file dimensions and duration...');
        // Get actual file dimensions and duration
        const [dimensions, duration] = await Promise.all([
          getFileDimensions(uploadedFile),
          getVideoDuration(uploadedFile)
        ]);

        console.log('File dimensions:', dimensions, 'Duration:', duration);

        // Check aspect ratio (9:16 = 0.5625)
        const aspectRatio = dimensions.width / dimensions.height;
        const targetRatio = 9 / 16; // 0.5625
        
        if (Math.abs(aspectRatio - targetRatio) > 0.01) {
          throw new Error(`Aspect ratio must be 9:16 (portrait). Current: ${dimensions.width}:${dimensions.height}. Please use an image with 9:16 aspect ratio.`);
        }

        // Check resolution (must be 1080x1920 or 2160x3840)
        const isValidResolution = (
          (dimensions.width === 1080 && dimensions.height === 1920) ||
          (dimensions.width === 2160 && dimensions.height === 3840)
        );
        
        if (!isValidResolution) {
          throw new Error(`Resolution must be 1080x1920 or 2160x3840. Current: ${dimensions.width}x${dimensions.height}. Please use the correct resolution.`);
        }

        // Create validation object with actual file data
        const validation = {
          isValid: true,
          dimensions,
          duration,
          errors: []
        };

        console.log('Validation passed, uploading to Supabase...');
        // Upload to Supabase Storage
        uploadedMediaAsset = await MediaService.uploadMedia(uploadedFile, validation, user.id);
        console.log('Upload successful:', uploadedMediaAsset);
      }
      
      console.log('Navigating to review page...');
      // Navigate to Review & Submit page with all campaign data
      navigate('/client/review-submit', {
        state: {
          ...campaignData,
          kiosks,
          mediaFile: uploadedFile,
          slotsPerWeek,
          uploadedMediaAsset,
          selectedCustomAd: selectedCustomAdForCampaign
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploadingToSupabase(false);
    }
  };

  const canContinue = (uploadedFile || selectedCustomAdForCampaign) && !isUploadingToSupabase;

  return (
    <DashboardLayout 
      title="Create New Campaign" 
      subtitle=""
      showBreadcrumb={false}
    >
      {/* Progress Steps */}
      <div className="mb-6 md:mb-8">
        {/* Mobile Progress - Vertical Stack */}
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
        
        {/* Desktop Progress - Horizontal */}
        <div className="hidden md:flex items-center space-x-4 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/client/select-weeks', { state: campaignData })}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Select Subscription</span>
        </button>
      </div>

      {/* Section Title */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">Add Media & Duration</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Choose your ad duration and upload media</p>
      </div>

      {/* Slot Reservation Warning */}
      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-yellow-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 font-medium text-sm md:text-base">
            Slot Reservation Your reserved slots will expire in {formatTime(timeRemaining)}. Please complete your purchase before time runs out.
          </span>
        </div>
      </div>

      {/* Add Media & Duration Section */}
      <div className="space-y-6 md:space-y-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Add Media & Duration
          </h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
            Choose your ad duration and upload media
          </p>
        </div>

        {/* Ad Slot Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          
          <div className="space-y-4">
            

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm md:text-base">Subscription Period</h4>
                <div className="space-y-2">
                  {selectedWeeks.length > 0 ? (() => {
                    const start = new Date(selectedWeeks[0]?.startDate);
                    const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate);
                    return (
                      <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: {selectedWeeks[0]?.slots || 1} slot{selectedWeeks[0]?.slots > 1 ? 's' : ''}
                      </div>
                    );
                  })() : (
                    <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">No subscription period selected</div>
                  )}
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                    Total Duration: {totalSlots * 15} seconds
                  </div>
                  <div className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-2">
                    {selectedWeeks.length > 0 ? (() => {
                      const start = new Date(selectedWeeks[0]?.startDate);
                      const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate);
                      const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
                      return `${months} month${months > 1 ? 's' : ''} selected`;
                    })() : 'No period selected'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slots Reserved Summary */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <span className="text-xs md:text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Slots reserved until:
            </span>
            <span className="text-xs md:text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {new Date(Date.now() + timeRemaining * 1000).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 text-xs md:text-sm">
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Base Rate:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">${baseRate.toFixed(2)} per slot</div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Total Slots:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">{totalSlots}</div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Duration:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                {subscriptionDuration} month{subscriptionDuration > 1 ? 's' : ''}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-yellow-700 dark:text-yellow-300">Slots per Month:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                {selectedWeeks.length > 0 ? (
                  <div>
                    {(() => {
                      const start = new Date(selectedWeeks[0]?.startDate);
                      const end = new Date(selectedWeeks[selectedWeeks.length - 1]?.endDate);
                      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${selectedWeeks[0]?.slots || 1} slot${selectedWeeks[0]?.slots > 1 ? 's' : ''}`;
                    })()}
                  </div>
                ) : (
                  <div>No subscription period</div>
                )}
              </div>
            </div>
            <div>
              <span className="text-yellow-700 dark:text-yellow-300">Total Cost:</span>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                {(() => {
                  // Calculate base cost: slots * rate * duration
                  const totalCost = totalSlots * baseRate * subscriptionDuration;
                  return `$${totalCost.toFixed(2)}`;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Ad Media & Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ad Media & Configuration
          </h3>

          {!showConfig ? (
            /* Media Selection Area */
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {useCustomAd ? 'Select Custom Ad' : 'Upload Your Ad Content'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {useCustomAd 
                    ? 'Choose from your approved custom ad designs.'
                    : 'Upload an image or video for your ad. Maximum file size: 50MB. Supported formats: JPEG, PNG, GIF, MP4, WebM, OGG. Required: 9:16 aspect ratio (portrait) with resolution 1080x1920 or 2160x3840.'
                  }
                </p>
              </div>

              {/* Media Selection Area */}
              {useCustomAd ? (
                /* Custom Ad Selection Box */
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  {selectedCustomAdForCampaign ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <CheckSquare className="h-12 w-12 text-green-600" />
                      </div>
                      <div className="text-center">
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {selectedCustomAdForCampaign.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          Custom ad design ready for deployment
                        </p>
                        <div className="flex justify-center space-x-3">
                          <button
                            onClick={handleSelectCustomAd}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            Change Selection
                          </button>
                          <button
                            onClick={() => setShowConfig(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Use This Ad
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
                          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Browse Custom Ads
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* File Upload Area */
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    uploadedFile 
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-300 hover:border-primary-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!uploadedFile ? (
                    <div className="space-y-4">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          JPEG, PNG, GIF, MP4, WebM, OGG up to 50MB
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">9:16 aspect ratio required (1080x1920 or 2160x3840)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filePreview && (
                        <div className="max-w-[270px] mx-auto">
                          <div style={{ aspectRatio: '9 / 16' }} className="w-full rounded-lg overflow-hidden bg-black">
                            {uploadedFile.type.startsWith('image/') ? (
                              <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <video src={filePreview} controls className="w-full h-full object-cover" />
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {uploadedFile.name}
                        </p>
                        <p className="text-sm text-gray-500 dark;text-gray-400">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConfig(true);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Upload Ad
                      </button>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            /* Ad Preview & Configuration Window */
            <div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Section - Preview */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-4">Preview</h5>
                  <div className="relative">
                    {/* Kiosk Preview */}
                    {filePreview && (
                      <div className="flex justify-center mb-4">
                        <KioskPreview
                          mediaUrl={filePreview}
                          mediaType={uploadedFile?.type.startsWith('image/') ? 'image' : 'video'}
                          title={uploadedFile?.name || 'Ad Preview'}
                          className="w-48 h-96"
                        />
                      </div>
                    )}
                    
                    {/* Remove File Button */}
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setFilePreview(null);
                        setUploadError(null);
                        setShowConfig(false);
                        setBackgroundColor('#000000');
                        setSelectedCustomAdForCampaign(null);
                      }}
                      className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Remove file</span>
                    </button>
                  </div>
                </div>

                {/* Right Section - Configuration */}
                <div className="space-y-6">
                  {/* File Information */}
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">File Information</h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>{uploadedFile?.name}</div>
                      <div>({uploadedFile ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0'} MB)</div>
                      <div>Type: {uploadedFile?.type.startsWith('image/') ? 'Image' : 'Video'}</div>
                    </div>
                  </div>

                  

                  {/* File Status */}
                  {uploadedFile && (
                    <div className="pt-4">
                      <div className="text-green-600 flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>File ready for upload</span>
                      </div>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="pt-4">
                      <div className="text-red-600">
                        <p>Upload failed: {uploadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end mt-6 md:mt-8">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-soft transition-colors text-sm md:text-base ${
            canContinue
              ? 'bg-gray-800 hover:bg-gray-900 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isUploadingToSupabase ? 'Uploading...' : 'Continue to Review'}
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
    </DashboardLayout>
  );
}
