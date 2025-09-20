export interface CustomAdValidationResult {
  isValid: boolean;
  errors: string[];
  dimensions?: { width: number; height: number };
  duration?: number;
  fileType: 'image' | 'video' | 'document' | 'other';
}

export interface CustomAdFileValidationOptions {
  maxFileSize?: number;
  maxVideoDuration?: number;
  allowedImageTypes?: string[];
  allowedVideoTypes?: string[];
  allowedDocumentTypes?: string[];
  allowAnyDimensions?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxFiles?: number;
}

const DEFAULT_CUSTOM_AD_OPTIONS: CustomAdFileValidationOptions = {
  maxFileSize: 100 * 1024 * 1024, // 100MB for custom ads
  maxVideoDuration: 300, // 5 minutes for custom ads
  allowedImageTypes: [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/svg+xml',
    'image/bmp',
    'image/tiff'
  ],
  allowedVideoTypes: [
    'video/mp4', 
    'video/avi', 
    'video/mov', 
    'video/wmv', 
    'video/flv', 
    'video/webm',
    'video/mkv',
    'video/3gp'
  ],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ],
  allowAnyDimensions: true,
  minWidth: 1,
  minHeight: 1,
  maxWidth: 8192,
  maxHeight: 8192,
  maxFiles: 20
};

export const validateCustomAdFile = async (
  file: File, 
  options: CustomAdFileValidationOptions = {}
): Promise<CustomAdValidationResult> => {
  const opts = { ...DEFAULT_CUSTOM_AD_OPTIONS, ...options };
  const errors: string[] = [];
  let fileType: 'image' | 'video' | 'document' | 'other' = 'other';

  // Check file type and categorize
  if (file.type.startsWith('image/')) {
    fileType = 'image';
    if (!opts.allowedImageTypes!.includes(file.type)) {
      errors.push(`Image type ${file.type} is not supported. Allowed: ${opts.allowedImageTypes!.join(', ')}`);
    }
  } else if (file.type.startsWith('video/')) {
    fileType = 'video';
    if (!opts.allowedVideoTypes!.includes(file.type)) {
      errors.push(`Video type ${file.type} is not supported. Allowed: ${opts.allowedVideoTypes!.join(', ')}`);
    }
  } else if (opts.allowedDocumentTypes!.includes(file.type)) {
    fileType = 'document';
  } else {
    errors.push(`File type ${file.type} is not supported`);
  }

  // Check file size
  if (file.size > opts.maxFileSize!) {
    errors.push(`File size must be under ${(opts.maxFileSize! / 1024 / 1024).toFixed(0)}MB`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, fileType };
  }

  // Validate dimensions for images and videos
  let dimensions: { width: number; height: number } | undefined;
  let duration: number | undefined;

  try {
    if (fileType === 'image' || fileType === 'video') {
      dimensions = await getFileDimensions(file);
      
      if (dimensions) {
        const { width, height } = dimensions;

        // Check dimension limits if not allowing any dimensions
        if (!opts.allowAnyDimensions) {
          if (width < opts.minWidth! || height < opts.minHeight!) {
            errors.push(`Minimum dimensions: ${opts.minWidth}×${opts.minHeight}. Current: ${width}×${height}`);
          }
          if (width > opts.maxWidth! || height > opts.maxHeight!) {
            errors.push(`Maximum dimensions: ${opts.maxWidth}×${opts.maxHeight}. Current: ${width}×${height}`);
          }
        }

        // Check video duration
        if (fileType === 'video') {
          duration = await getVideoDuration(file);
          if (duration && duration > opts.maxVideoDuration!) {
            errors.push(`Video duration must be ${opts.maxVideoDuration} seconds or less`);
          }
        }
      }
    }

    if (errors.length === 0) {
      return { 
        isValid: true, 
        errors: [], 
        dimensions,
        duration,
        fileType
      };
    }
  } catch (error) {
    errors.push('Failed to validate file properties');
  }

  return { isValid: false, errors, fileType, dimensions, duration };
};

export const validateCustomAdFiles = async (
  files: File[],
  options: CustomAdFileValidationOptions = {}
): Promise<{
  validFiles: File[];
  invalidFiles: Array<{ file: File; errors: string[] }>;
  totalSize: number;
}> => {
  const opts = { ...DEFAULT_CUSTOM_AD_OPTIONS, ...options };
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; errors: string[] }> = [];
  let totalSize = 0;

  // Check file count limit
  if (files.length > opts.maxFiles!) {
    invalidFiles.push({
      file: files[0], // Use first file as representative
      errors: [`Maximum ${opts.maxFiles} files allowed. You selected ${files.length} files.`]
    });
    return { validFiles, invalidFiles, totalSize };
  }

  // Validate each file
  for (const file of files) {
    const validation = await validateCustomAdFile(file, options);
    
    if (validation.isValid) {
      validFiles.push(file);
      totalSize += file.size;
    } else {
      invalidFiles.push({
        file,
        errors: validation.errors
      });
    }
  }

  return { validFiles, invalidFiles, totalSize };
};

export const getFileDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    } else {
      resolve(null);
    }
  });
};

export const getVideoDuration = (file: File): Promise<number | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(Math.round(video.duration));
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  return '📁';
};

export const getFileTypeDisplayName = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'Image';
  if (fileType.startsWith('video/')) return 'Video';
  if (fileType.includes('pdf')) return 'PDF Document';
  if (fileType.includes('word')) return 'Word Document';
  if (fileType.includes('excel')) return 'Excel Spreadsheet';
  if (fileType.includes('powerpoint')) return 'PowerPoint Presentation';
  if (fileType.includes('zip')) return 'ZIP Archive';
  if (fileType.includes('rar')) return 'RAR Archive';
  if (fileType.includes('text')) return 'Text File';
  return 'File';
};

export const getAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  
  // Common aspect ratios
  if (ratioW === 16 && ratioH === 9) return '16:9 (Widescreen)';
  if (ratioW === 9 && ratioH === 16) return '9:16 (Portrait)';
  if (ratioW === 4 && ratioH === 3) return '4:3 (Standard)';
  if (ratioW === 3 && ratioH === 4) return '3:4 (Portrait)';
  if (ratioW === 1 && ratioH === 1) return '1:1 (Square)';
  if (ratioW === 21 && ratioH === 9) return '21:9 (Ultrawide)';
  
  return `${ratioW}:${ratioH}`;
};
