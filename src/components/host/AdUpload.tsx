import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Play, Pause, Eye, CheckCircle, AlertCircle, FileImage, FileVideo } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd } from '../../services/hostService';
import { supabase } from '../../lib/supabaseClient';
import { validateFile } from '../../utils/fileValidation';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface AdUploadProps {
  onUploadComplete?: (ad: HostAd) => void;
  onCancel?: () => void;
}

export default function AdUpload({ onUploadComplete, onCancel }: AdUploadProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 15
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous validation errors
    setFileValidationError(null);
    setValidationErrors(prev => ({ ...prev, file: undefined }));

    try {
      // Use comprehensive validation
      const validation = await validateFile(file);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.join('. ');
        setFileValidationError(errorMessage);
        addNotification('error', 'File Validation Failed', errorMessage);
        return;
      }

      // Determine media type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      setMediaType(isImage ? 'image' : 'video');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-fill name if empty
      if (!formData.name) {
        setFormData(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
        }));
      }

      // Show validation success message
      addNotification('success', 'File Validated', 'File meets all requirements and is ready for upload');
      
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = 'Failed to validate file. Please try again.';
      setFileValidationError(errorMessage);
      addNotification('error', 'Validation Error', errorMessage);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Ad name is required';
    }

    if (!preview) {
      errors.file = 'Please select a file to upload';
    }

    if (formData.duration < 1 || formData.duration > 15) {
      errors.duration = 'Duration must be between 1 and 15 seconds';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpload = async () => {
    if (!user?.id || !validateForm()) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addNotification('error', 'No File', 'Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Create ad record
      const ad = await HostService.uploadAd({
        hostId: user.id,
        name: formData.name,
        description: formData.description,
        mediaUrl: urlData.publicUrl,
        mediaType: mediaType!,
        duration: formData.duration
      });

      addNotification('success', 'Upload Successful', 'Your ad has been uploaded successfully');
      
      if (onUploadComplete) {
        onUploadComplete(ad);
      } else {
        // Navigate back to ads page if no callback provided
        navigate('/host/ads');
      }

      // Reset form
      setPreview(null);
      setMediaType(null);
      setFormData({ name: '', description: '', duration: 15 });
      setValidationErrors({});
      setFileValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      addNotification('error', 'Upload Failed', `Failed to upload ad: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!user?.id || !validateForm()) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addNotification('error', 'No File', 'Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Upload file first
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Create ad record
      const ad = await HostService.uploadAd({
        hostId: user.id,
        name: formData.name,
        description: formData.description,
        mediaUrl: urlData.publicUrl,
        mediaType: mediaType!,
        duration: formData.duration
      });

      // Submit for review
      await HostService.submitAdForReview(ad.id);

      addNotification('success', 'Submitted for Review', 'Your ad has been submitted for review');
      
      if (onUploadComplete) {
        onUploadComplete(ad);
      } else {
        // Navigate back to ads page if no callback provided
        navigate('/host/ads');
      }

      // Reset form
      setPreview(null);
      setMediaType(null);
      setFormData({ name: '', description: '', duration: 15 });
      setValidationErrors({});
      setFileValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Submit error:', error);
      addNotification('error', 'Submission Failed', `Failed to submit ad for review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card title="Upload New Ad" subtitle="Upload and configure your advertisement">
        <div className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Media File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                fileValidationError
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : preview
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,video/mp4"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {fileValidationError ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-red-900 dark:text-red-100">
                      File Validation Failed
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      {fileValidationError}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                      Please select a valid file that meets all requirements
                    </p>
                  </div>
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {mediaType === 'image' ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                  ) : (
                    <video
                      src={preview}
                      controls
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">File selected successfully</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Images (JPG, PNG) or Videos (MP4)
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Images: 10MB max • Videos: 500MB max • 9:16 aspect ratio required
                    </p>
                  </div>
                </div>
              )}
            </div>
            {validationErrors.file && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {validationErrors.file}
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ad Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter ad name"
              />
              {validationErrors.name && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (seconds) *
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 15 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              {validationErrors.duration && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.duration}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe your ad (optional)"
            />
          </div>

          {/* Media Type Info */}
          {mediaType && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              {mediaType === 'image' ? (
                <FileImage className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <FileVideo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {mediaType === 'image' ? 'Image' : 'Video'} detected
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {onCancel ? (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={uploading}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => navigate('/host/ads')}
                disabled={uploading}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleUpload}
              disabled={uploading || !preview}
              loading={uploading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={uploading || !preview}
              loading={uploading}
            >
              Submit for Review
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
