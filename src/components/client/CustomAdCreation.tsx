import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle,
  Target,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { CustomAdCreationService, CustomAdCreationInput } from '../../services/customAdCreationService';
import { 
  validateCustomAdFiles, 
  formatFileSize, 
  getFileIcon, 
  getFileTypeDisplayName,
  getAspectRatio
} from '../../utils/customAdFileValidation';
import Button from '../ui/Button';

interface CustomAdCreationProps {
  onComplete?: (creationId: string) => void;
  onCancel?: () => void;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  fileType: 'image' | 'video' | 'document' | 'other';
  aspectRatio?: string;
}

export default function CustomAdCreation({ onComplete, onCancel }: CustomAdCreationProps) {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CustomAdCreationInput>({
    title: '',
    description: '',
    category: '',
    priority: 'normal',
    budgetRange: '',
    deadline: '',
    specialRequirements: '',
    targetAudience: '',
    brandGuidelines: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const categories = [
    'Social Media Campaign',
    'Display Advertising',
    'Video Production',
    'Brand Identity',
    'Print Design',
    'Web Design',
    'Motion Graphics',
    'Photography',
    'Copywriting',
    'Other'
  ];

  const budgetRanges = [
    'Under $500',
    '$500 - $1,000',
    '$1,000 - $2,500',
    '$2,500 - $5,000',
    '$5,000 - $10,000',
    '$10,000+'
  ];

  const handleInputChange = (field: keyof CustomAdCreationInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const maxFiles = 20;
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total

    // Check file count limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      addNotification('error', 'Too Many Files', `Maximum ${maxFiles} files allowed. You currently have ${uploadedFiles.length} files.`);
      return;
    }

    // Check total size limit
    const currentTotalSize = uploadedFiles.reduce((sum, file) => sum + file.file.size, 0);
    const newFilesSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    
    if (currentTotalSize + newFilesSize > maxTotalSize) {
      addNotification('error', 'File Size Limit', 'Total file size cannot exceed 500MB');
      return;
    }

    setIsUploading(true);
    setValidationErrors([]);

    try {
      // Validate files
      const validation = await validateCustomAdFiles(fileArray);
      
      if (validation.invalidFiles.length > 0) {
        const errorMessages = validation.invalidFiles.map(
          ({ file, errors }) => `${file.name}: ${errors.join(', ')}`
        );
        setValidationErrors(errorMessages);
        addNotification('error', 'File Validation Failed', `${validation.invalidFiles.length} files failed validation`);
      }

      // Process valid files
      const newUploadedFiles: UploadedFile[] = [];
      
      for (const file of validation.validFiles) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create preview for images and videos
        let preview: string | undefined;
        let dimensions: { width: number; height: number } | undefined;
        let duration: number | undefined;
        let aspectRatio: string | undefined;

        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
          const img = new window.Image();
          img.onload = () => {
            dimensions = { width: img.width, height: img.height };
            aspectRatio = getAspectRatio(img.width, img.height);
            setUploadedFiles(prev => prev.map(f => 
              f.id === fileId ? { ...f, dimensions, aspectRatio } : f
            ));
            URL.revokeObjectURL(img.src);
          };
          img.src = preview;
        } else if (file.type.startsWith('video/')) {
          preview = URL.createObjectURL(file);
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            dimensions = { width: video.videoWidth, height: video.videoHeight };
            duration = Math.round(video.duration);
            aspectRatio = getAspectRatio(video.videoWidth, video.videoHeight);
            setUploadedFiles(prev => prev.map(f => 
              f.id === fileId ? { ...f, dimensions, duration, aspectRatio } : f
            ));
            URL.revokeObjectURL(video.src);
          };
          video.src = preview;
        }

        const fileType = file.type.startsWith('image/') ? 'image' : 
                        file.type.startsWith('video/') ? 'video' : 
                        file.type.includes('pdf') || file.type.includes('document') ? 'document' : 'other';

        newUploadedFiles.push({
          file,
          id: fileId,
          preview,
          dimensions,
          duration,
          fileType,
          aspectRatio
        });
      }

      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      
      if (validation.validFiles.length > 0) {
        addNotification('success', 'Files Added', `${validation.validFiles.length} files added successfully`);
      }

    } catch (error) {
      console.error('File upload error:', error);
      addNotification('error', 'Upload Error', 'Failed to process files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, addNotification]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSaveDraft = async () => {
    if (!user?.id) {
      addNotification('error', 'Authentication Error', 'Please log in to save your custom ad creation');
      return;
    }

    if (!validateForm()) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    if (isSaving) {
      console.log('Save already in progress, ignoring duplicate call');
      return;
    }

    // Generate unique submission ID to prevent duplicate submissions
    const currentSubmissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (submissionId && submissionId === currentSubmissionId) {
      console.log('Duplicate submission detected, ignoring');
      return;
    }
    setSubmissionId(currentSubmissionId);

    setIsSaving(true);

    try {
      console.log('Creating custom ad creation with data:', { ...formData, files: uploadedFiles.map(f => f.file) });
      const creation = await CustomAdCreationService.createCustomAdCreation(user.id, {
        ...formData,
        files: uploadedFiles.map(f => f.file)
      });
      console.log('Custom ad creation created:', creation);

      addNotification('success', 'Draft Saved', 'Your custom ad creation has been saved as a draft');
      
      if (onComplete) {
        onComplete(creation.id);
      } else {
        navigate('/manage-custom-ads');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      addNotification('error', 'Save Failed', 'Failed to save custom ad creation. Please try again.');
    } finally {
      setIsSaving(false);
      setSubmissionId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      addNotification('error', 'Authentication Error', 'Please log in to submit your custom ad creation');
      return;
    }

    if (!validateForm()) {
      addNotification('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    if (isSaving) {
      console.log('Submit already in progress, ignoring duplicate call');
      return;
    }

    // Generate unique submission ID to prevent duplicate submissions
    const currentSubmissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (submissionId && submissionId === currentSubmissionId) {
      console.log('Duplicate submission detected, ignoring');
      return;
    }
    setSubmissionId(currentSubmissionId);

    setIsSaving(true);

    try {
      console.log('Creating custom ad creation with data:', { ...formData, files: uploadedFiles.map(f => f.file) });
      const creation = await CustomAdCreationService.createCustomAdCreation(user.id, {
        ...formData,
        files: uploadedFiles.map(f => f.file)
      });
      console.log('Custom ad creation created:', creation);

      // Submit for review
      await CustomAdCreationService.submitForReview(creation.id);
      console.log('Custom ad creation submitted for review');

      addNotification('success', 'Submitted for Review', 'Your custom ad creation has been submitted for review');
      
      if (onComplete) {
        onComplete(creation.id);
      } else {
        navigate('/manage-custom-ads');
      }
    } catch (error) {
      console.error('Error submitting custom ad creation:', error);
      addNotification('error', 'Submission Failed', 'Failed to submit custom ad creation. Please try again.');
    } finally {
      setIsSaving(false);
      setSubmissionId(null);
    }
  };

  const getTotalFileSize = () => {
    return uploadedFiles.reduce((sum, file) => sum + file.file.size, 0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create Custom Ad
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Upload your media files and provide details for your custom ad creation request
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter a descriptive title"
              />
              {formErrors.title && (
                <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Describe your custom ad requirements in detail..."
            />
            {formErrors.description && (
              <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Project Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Range
              </label>
              <select
                value={formData.budgetRange}
                onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select budget range</option>
                {budgetRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Additional Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe your target audience..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Guidelines
              </label>
              <textarea
                value={formData.brandGuidelines}
                onChange={(e) => handleInputChange('brandGuidelines', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Any specific brand guidelines or requirements..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Special Requirements
            </label>
            <textarea
              value={formData.specialRequirements}
              onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Any special requirements or notes..."
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Media Files
          </h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports images, videos, and documents up to 100MB each
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              disabled={isUploading}
            >
              {isUploading ? 'Processing...' : 'Choose Files'}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <h3 className="text-red-800 dark:text-red-200 font-medium">
                  File Validation Errors
                </h3>
              </div>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div className="text-sm text-gray-500">
                  Total size: {formatFileSize(getTotalFileSize())}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileIcon(uploadedFile.file.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getFileTypeDisplayName(uploadedFile.file.type)} • {formatFileSize(uploadedFile.file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(uploadedFile.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {uploadedFile.preview && (
                      <div className="mb-2">
                        {uploadedFile.fileType === 'image' ? (
                          <img
                            src={uploadedFile.preview}
                            alt={uploadedFile.file.name}
                            className="w-full h-20 object-cover rounded"
                          />
                        ) : uploadedFile.fileType === 'video' ? (
                          <video
                            src={uploadedFile.preview}
                            className="w-full h-20 object-cover rounded"
                            muted
                          />
                        ) : null}
                      </div>
                    )}
                    
                    {uploadedFile.dimensions && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Dimensions: {uploadedFile.dimensions.width} × {uploadedFile.dimensions.height}</p>
                        {uploadedFile.aspectRatio && (
                          <p>Aspect Ratio: {uploadedFile.aspectRatio}</p>
                        )}
                        {uploadedFile.duration && (
                          <p>Duration: {uploadedFile.duration}s</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
          <Button
            onClick={onCancel || (() => navigate('/client/custom-ads'))}
            variant="secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleSaveDraft}
              variant="secondary"
              disabled={isSaving || !formData.title.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !formData.title.trim()}
            >
              {isSaving ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
