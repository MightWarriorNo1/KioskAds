export interface GoogleDriveError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
  action: string;
}

export class GoogleDriveErrorHandler {
  /**
   * Parse and categorize Google Drive API errors
   */
  static parseError(error: any): GoogleDriveError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Check for specific Google API error patterns
    if (errorMessage.includes('invalid_grant')) {
      return {
        code: 'INVALID_GRANT',
        message: 'Invalid refresh token. The token may have expired or been revoked.',
        details: 'Please re-authenticate with Google Drive to get a new refresh token.',
        retryable: false,
        action: 'REAUTHENTICATE'
      };
    }
    
    if (errorMessage.includes('invalid_client')) {
      return {
        code: 'INVALID_CLIENT',
        message: 'Invalid client credentials. Please check your Client ID and Secret.',
        details: 'Verify that the OAuth 2.0 credentials are correct in your Google Cloud Console.',
        retryable: false,
        action: 'CHECK_CREDENTIALS'
      };
    }
    
    if (errorMessage.includes('access_denied')) {
      return {
        code: 'ACCESS_DENIED',
        message: 'Access denied. Insufficient permissions for the requested operation.',
        details: 'Ensure the Google Drive API is enabled and the account has proper permissions.',
        retryable: false,
        action: 'CHECK_PERMISSIONS'
      };
    }
    
    if (errorMessage.includes('quotaExceeded')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Google Drive API quota exceeded. Please try again later.',
        details: 'The daily API quota has been exceeded. Wait for the quota to reset.',
        retryable: true,
        action: 'RETRY_LATER'
      };
    }
    
    if (errorMessage.includes('rateLimitExceeded')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Too many requests in a short time.',
        details: 'Please wait before making another request.',
        retryable: true,
        action: 'RETRY_WITH_BACKOFF'
      };
    }
    
    if (errorMessage.includes('fileNotFound')) {
      return {
        code: 'FILE_NOT_FOUND',
        message: 'File not found in Google Drive.',
        details: 'The specified file may have been deleted or moved.',
        retryable: false,
        action: 'CHECK_FILE_EXISTS'
      };
    }
    
    if (errorMessage.includes('insufficientFilePermissions')) {
      return {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access the file.',
        details: 'The file may be owned by another user or have restricted access.',
        retryable: false,
        action: 'CHECK_FILE_PERMISSIONS'
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred while communicating with Google Drive.',
        details: 'Check your internet connection and try again.',
        retryable: true,
        action: 'RETRY'
      };
    }
    
    // Default error for unknown cases
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred with Google Drive API.',
      details: errorMessage,
      retryable: true,
      action: 'RETRY'
    };
  }
  
  /**
   * Check if an error is retryable
   */
  static isRetryable(error: any): boolean {
    const parsedError = this.parseError(error);
    return parsedError.retryable;
  }
  
  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    const parsedError = this.parseError(error);
    return parsedError.message;
  }
  
  /**
   * Get suggested action for the error
   */
  static getSuggestedAction(error: any): string {
    const parsedError = this.parseError(error);
    return parsedError.action;
  }
  
  /**
   * Get detailed error information
   */
  static getErrorDetails(error: any): GoogleDriveError {
    return this.parseError(error);
  }
  
  /**
   * Log error with appropriate level based on error type
   */
  static logError(error: any, context: string = 'Google Drive Operation'): void {
    const parsedError = this.parseError(error);
    
    const logMessage = `${context} failed: ${parsedError.message}`;
    const logDetails = {
      code: parsedError.code,
      details: parsedError.details,
      retryable: parsedError.retryable,
      action: parsedError.action,
      originalError: error
    };
    
    if (parsedError.retryable) {
      console.warn(logMessage, logDetails);
    } else {
      console.error(logMessage, logDetails);
    }
  }
  
  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: any, context: string = 'Google Drive Operation') {
    const parsedError = this.parseError(error);
    
    return {
      success: false,
      error: {
        code: parsedError.code,
        message: parsedError.message,
        details: parsedError.details,
        action: parsedError.action,
        retryable: parsedError.retryable
      },
      context
    };
  }
  
  /**
   * Retry logic with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

