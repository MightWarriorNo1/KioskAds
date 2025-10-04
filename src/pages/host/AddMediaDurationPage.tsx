import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { MediaService } from '../../services/mediaService';
import { useAuth } from '../../contexts/AuthContext';
import { validateFile } from '../../utils/fileValidation';
import PhonePreview from '../../components/admin/PhonePreview';

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
  const selectedWeeks = campaignData.selectedWeeks || [];
  const totalSlots = campaignData.totalSlots || 1;
  const baseRate = campaignData.baseRate || 40.00;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Choose Weeks', current: false, completed: true },
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

  const canContinue = uploadedFile && !isUploadingToSupabase && fileValidation && !fileValidationError;

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
          <span>Back to Select Weeks</span>
        </button>
      </div>

      {/* Upload & Duration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">Upload Media</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time remaining: {formatTime(timeRemaining)}</div>
          </div>
          <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
            {filePreview ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <PhonePreview
                    mediaUrl={filePreview}
                    mediaType={uploadedFile?.type.startsWith('image/') ? 'image' : 'video'}
                    title={uploadedFile?.name || 'Ad Preview'}
                    className="w-80 h-96"
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
            <div className="mt-4 text-xs text-gray-500 space-y-1">
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
              <label className="block text-sm font-medium mb-2">Slots per week</label>
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
            const uploadedMediaAsset = await handleUpload();
            if (!uploadedMediaAsset) return;
            navigate('/host/review-submit', { state: { ...campaignData, slotsPerWeek, uploadedMediaAsset } });
          }}
          className={`px-6 py-3 rounded-xl font-semibold ${canContinue ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
        >
          Continue to Review & Submit
        </button>
      </div>
    </div>
  );
}


