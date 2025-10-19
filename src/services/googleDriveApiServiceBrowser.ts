import { GoogleDriveConfig } from '../types/database';
import { GoogleDriveErrorHandler } from '../utils/googleDriveErrorHandler';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export class GoogleDriveApiServiceBrowser {
  private static getAuth(config: GoogleDriveConfig) {
    // For browser environment, we'll use a different approach
    // This will be implemented using fetch API directly to Google Drive REST API
    return {
      client_id: config.client_id,
      client_secret: config.client_secret,
      refresh_token: config.refresh_token
    };
  }

  private static async getAccessToken(config: GoogleDriveConfig): Promise<string> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: config.client_secret,
          refresh_token: config.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, 'Token Refresh');
      throw error;
    }
  }

  private static async makeApiRequest(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    config: GoogleDriveConfig
  ): Promise<any> {
    const accessToken = await this.getAccessToken(config);
    
    const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
    }

    return response.json();
  }

  /**
   * Test Google Drive connection by listing files
   */
  static async testConnection(config: GoogleDriveConfig): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.makeApiRequest('/files?pageSize=1&fields=nextPageToken,files(id,name)', 'GET', undefined, config);
      
      return {
        success: true,
        message: 'Google Drive connection successful!'
      };
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, 'Google Drive Connection Test');
      const errorDetails = GoogleDriveErrorHandler.getErrorDetails(error);
      
      return {
        success: false,
        message: errorDetails.message
      };
    }
  }

  /**
   * Create a folder in Google Drive
   */
  static async createFolder(
    config: GoogleDriveConfig,
    folderName: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFolder> {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.makeApiRequest('/files', 'POST', fileMetadata, config);

      if (!response.id) {
        throw new Error('Failed to create folder: No ID returned');
      }

      return {
        id: response.id,
        name: response.name || folderName,
        parents: response.parents,
        webViewLink: response.webViewLink,
        createdTime: response.createdTime,
        modifiedTime: response.modifiedTime
      };
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `Folder Creation: ${folderName}`);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive using multipart upload
   */
  static async uploadFile(
    config: GoogleDriveConfig,
    filePath: string,
    fileName: string,
    mimeType: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    try {
      // For browser environment, we need to handle file upload differently
      // This would typically be done through a file input or drag-and-drop
      throw new Error('File upload from file path not supported in browser environment. Use uploadFileFromBuffer instead.');
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Upload: ${fileName}`);
      throw error;
    }
  }

  /**
   * Upload a file from buffer to Google Drive
   */
  static async uploadFileFromBuffer(
    config: GoogleDriveConfig,
    fileBuffer: ArrayBuffer,
    fileName: string,
    mimeType: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    return GoogleDriveErrorHandler.retryWithBackoff(async () => {
      try {
        const accessToken = await this.getAccessToken(config);
        
        // Create metadata
        const metadata = {
          name: fileName,
          parents: parentFolderId ? [parentFolderId] : undefined
        };

        // Create multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        // Create multipart body with proper binary handling
        const metadataPart = delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata);
        
        const filePart = delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`;
        
        // Convert ArrayBuffer to Uint8Array for proper binary handling
        const fileBytes = new Uint8Array(fileBuffer);
        
        // Create the complete body by combining parts
        const body = new Uint8Array(
          metadataPart.length + 
          filePart.length + 
          fileBytes.length + 
          close_delim.length
        );
        
        let offset = 0;
        
        // Add metadata part
        body.set(new TextEncoder().encode(metadataPart), offset);
        offset += metadataPart.length;
        
        // Add file part header
        body.set(new TextEncoder().encode(filePart), offset);
        offset += filePart.length;
        
        // Add binary file content
        body.set(fileBytes, offset);
        offset += fileBytes.length;
        
        // Add closing delimiter
        body.set(new TextEncoder().encode(close_delim), offset);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: body
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
        }

        const data = await response.json();

        if (!data.id) {
          throw new Error('Failed to upload file: No ID returned');
        }

        return {
          id: data.id,
          name: data.name || fileName,
          mimeType: data.mimeType || mimeType,
          size: data.size,
          parents: data.parents,
          webViewLink: data.webViewLink,
          webContentLink: data.webContentLink,
          createdTime: data.createdTime,
          modifiedTime: data.modifiedTime
        };
      } catch (error) {
        GoogleDriveErrorHandler.logError(error, `File Upload: ${fileName}`);
        throw error;
      }
    });
  }

  /**
   * Move a file from one folder to another
   */
  static async moveFile(
    config: GoogleDriveConfig,
    fileId: string,
    fromFolderId: string,
    toFolderId: string
  ): Promise<void> {
    try {
      // First, get the current parents of the file
      const file = await this.makeApiRequest(`/files/${fileId}?fields=parents`, 'GET', undefined, config);
      const previousParents = file.parents?.join(',') || '';

      // Move the file to the new folder
      await this.makeApiRequest(
        `/files/${fileId}?addParents=${toFolderId}&removeParents=${fromFolderId}`,
        'PATCH',
        undefined,
        config
      );
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Move: ${fileId}`);
      throw error;
    }
  }

  /**
   * Copy a file to another folder
   */
  static async copyFile(
    config: GoogleDriveConfig,
    fileId: string,
    toFolderId: string,
    newName?: string
  ): Promise<GoogleDriveFile> {
    try {
      const fileMetadata = {
        parents: [toFolderId],
        name: newName
      };

      const response = await this.makeApiRequest(`/files/${fileId}/copy`, 'POST', fileMetadata, config);

      if (!response.id) {
        throw new Error('Failed to copy file: No ID returned');
      }

      return {
        id: response.id,
        name: response.name || newName || 'Copy of file',
        mimeType: response.mimeType || '',
        size: response.size,
        parents: response.parents,
        webViewLink: response.webViewLink,
        webContentLink: response.webContentLink,
        createdTime: response.createdTime,
        modifiedTime: response.modifiedTime
      };
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Copy: ${fileId}`);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  static async deleteFile(config: GoogleDriveConfig, fileId: string): Promise<void> {
    try {
      await this.makeApiRequest(`/files/${fileId}`, 'DELETE', undefined, config);
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Delete: ${fileId}`);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  static async listFiles(
    config: GoogleDriveConfig,
    folderId?: string,
    pageSize: number = 100
  ): Promise<GoogleDriveFile[]> {
    try {
      const query = folderId ? `'${folderId}' in parents` : undefined;
      const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
      
      const response = await this.makeApiRequest(
        `/files?pageSize=${pageSize}&fields=nextPageToken,files(id,name,mimeType,size,parents,webViewLink,webContentLink,createdTime,modifiedTime)${qParam}`,
        'GET',
        undefined,
        config
      );

      return (response.files || []).map((file: any) => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: file.size,
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      }));
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, 'File Listing');
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getFile(
    config: GoogleDriveConfig,
    fileId: string
  ): Promise<GoogleDriveFile> {
    try {
      const response = await this.makeApiRequest(
        `/files/${fileId}?fields=id,name,mimeType,size,parents,webViewLink,webContentLink,createdTime,modifiedTime`,
        'GET',
        undefined,
        config
      );

      return {
        id: response.id || '',
        name: response.name || '',
        mimeType: response.mimeType || '',
        size: response.size,
        parents: response.parents,
        webViewLink: response.webViewLink,
        webContentLink: response.webContentLink,
        createdTime: response.createdTime,
        modifiedTime: response.modifiedTime
      };
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Get: ${fileId}`);
      throw error;
    }
  }

  /**
   * Download file content
   */
  static async downloadFile(
    config: GoogleDriveConfig,
    fileId: string
  ): Promise<ArrayBuffer> {
    try {
      const accessToken = await this.getAccessToken(config);
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      return response.arrayBuffer();
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Download: ${fileId}`);
      throw error;
    }
  }

  /**
   * Search for files by name
   */
  static async searchFiles(
    config: GoogleDriveConfig,
    fileName: string,
    folderId?: string
  ): Promise<GoogleDriveFile[]> {
    try {
      let query = `name contains '${fileName}'`;
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }
      
      const response = await this.makeApiRequest(
        `/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,size,parents,webViewLink,webContentLink,createdTime,modifiedTime)`,
        'GET',
        undefined,
        config
      );

      return (response.files || []).map((file: any) => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: file.size,
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      }));
    } catch (error) {
      GoogleDriveErrorHandler.logError(error, `File Search: ${fileName}`);
      throw error;
    }
  }
}

