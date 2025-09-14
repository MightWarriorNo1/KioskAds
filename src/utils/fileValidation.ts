export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  dimensions?: { width: number; height: number };
  duration?: number;
}

export interface FileValidationOptions {
  maxImageSize?: number;
  maxVideoSize?: number;
  maxVideoDuration?: number;
  allowedImageTypes?: string[];
  allowedVideoTypes?: string[];
  requiredAspectRatio?: number;
  allowedResolutions?: Array<{ width: number; height: number }>;
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 500 * 1024 * 1024, // 500MB
  maxVideoDuration: 15, // 15 seconds
  allowedImageTypes: ['image/jpeg', 'image/png'],
  allowedVideoTypes: ['video/mp4'],
  requiredAspectRatio: 9 / 16, // 9:16 portrait
  allowedResolutions: [
    { width: 1080, height: 1920 },
    { width: 2160, height: 3840 }
  ]
};

export const validateFile = async (
  file: File, 
  options: FileValidationOptions = {}
): Promise<ValidationResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Check file type
  if (file.type.startsWith('image/')) {
    if (!opts.allowedImageTypes!.includes(file.type)) {
      errors.push(`Only ${opts.allowedImageTypes!.map(t => t.split('/')[1].toUpperCase()).join(' and ')} images are allowed`);
    }
    if (file.size > opts.maxImageSize!) {
      errors.push(`Image size must be under ${(opts.maxImageSize! / 1024 / 1024).toFixed(0)}MB`);
    }
  } else if (file.type.startsWith('video/')) {
    if (!opts.allowedVideoTypes!.includes(file.type)) {
      errors.push(`Only ${opts.allowedVideoTypes!.map(t => t.split('/')[1].toUpperCase()).join(' and ')} videos are allowed`);
    }
    if (file.size > opts.maxVideoSize!) {
      errors.push(`Video size must be under ${(opts.maxVideoSize! / 1024 / 1024).toFixed(0)}MB`);
    }
  } else {
    errors.push('Only images and videos are allowed');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate dimensions
  try {
    const dimensions = await getFileDimensions(file);
    if (dimensions) {
      const { width, height } = dimensions;
      const aspectRatio = width / height;

      // Check aspect ratio
      if (Math.abs(aspectRatio - opts.requiredAspectRatio!) > 0.01) {
        errors.push(`Aspect ratio must be 9:16 (portrait). Current: ${width}:${height}`);
      }

      // Check resolution
      const isValidResolution = opts.allowedResolutions!.some(
        res => res.width === width && res.height === height
      );

      if (!isValidResolution) {
        errors.push(`Resolution must be ${opts.allowedResolutions!.map(r => `${r.width}×${r.height}`).join(' or ')}. Current: ${width}×${height}`);
      }

      // Check video duration
      let duration: number | undefined;
      if (file.type.startsWith('video/')) {
        duration = await getVideoDuration(file);
        if (duration && duration > opts.maxVideoDuration!) {
          errors.push(`Video duration must be ${opts.maxVideoDuration} seconds or less`);
        }
      }

      if (errors.length === 0) {
        return { 
          isValid: true, 
          errors: [], 
          dimensions: { width, height },
          duration
        };
      }
    }
  } catch (error) {
    errors.push('Failed to validate file dimensions');
  }

  return { isValid: false, errors };
};

export const getFileDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => resolve(null);
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
      // Convert to integer seconds for database compatibility
      resolve(Math.round(video.duration));
    };
    video.onerror = () => resolve(null);
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
  return '📄';
};

