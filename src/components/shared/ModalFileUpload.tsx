import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, FileText } from 'lucide-react';
import { validateCustomAdFile } from '../../utils/customAdFileValidation';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  name: string;
  size: number;
  type: string;
}

interface ModalFileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

export default function ModalFileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  maxFileSize = 100, // 100MB default
  acceptedTypes = ['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  className = ''
}: ModalFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (newFiles: FileList) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    
    // Check total file count
    if (files.length + fileArray.length > maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - files.length} more files.`]);
      return;
    }

    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      try {
        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          errors.push(`${file.name}: File size exceeds ${maxFileSize}MB limit`);
          continue;
        }

        // Validate file using existing validation
        const validation = await validateCustomAdFile(file, { allowAnyDimensions: true });
        
        if (!validation.isValid) {
          errors.push(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Create preview for images and videos
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        } else if (file.type.startsWith('video/')) {
          preview = URL.createObjectURL(file);
        }

        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          name: file.name,
          size: file.size,
          type: file.type
        };

        validFiles.push(uploadedFile);
      } catch (error) {
        console.error('Validation error for file:', file.name, error);
        errors.push(`${file.name}: Failed to validate file`);
      }
    }

    setValidationErrors(errors);

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, maxFiles, maxFileSize, onFilesChange]);

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
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    return FileText;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="space-y-2">
          <Upload className="w-8 h-8 text-gray-400 mx-auto" />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max {maxFiles} files, {maxFileSize}MB each
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileUpload(e.target.files || new FileList())}
        className="hidden"
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="text-sm text-red-600 dark:text-red-400">
            {validationErrors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attached Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
