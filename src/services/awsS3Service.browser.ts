// Browser-compatible version of AWS S3 Service
// This is a fallback implementation for client-side usage

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3Object {
  key: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

export class AWSS3Service {
  // Browser-compatible mock implementation
  // In a real application, these operations should be handled server-side
  
  private static createS3Client(config: S3Config): any {
    // Mock S3 client for browser environment
    return {
      config,
      send: async (command: any) => {
        throw new Error('AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.');
      }
    };
  }

  // List objects in S3 bucket with optional prefix
  static async listObjects(
    config: S3Config, 
    prefix: string = '', 
    maxKeys: number = 1000
  ): Promise<S3Object[]> {
    throw new Error('AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.');
  }

  // Get object metadata
  static async getObjectMetadata(config: S3Config, key: string): Promise<{
    contentLength?: number;
    lastModified?: Date;
    contentType?: string;
    etag?: string;
  }> {
    throw new Error('AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.');
  }

  // Download object as text (for CSV files)
  static async getObjectAsText(config: S3Config, key: string): Promise<string> {
    throw new Error('AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.');
  }

  // Generate presigned URL for object access
  static async getPresignedUrl(
    config: S3Config, 
    key: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    throw new Error('AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.');
  }

  // Test S3 connection and permissions
  static async testConnection(config: S3Config, options?: { prefix?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    return {
      success: false,
      message: 'AWS S3 operations are not supported in browser environment. Please use server-side API endpoints.',
      details: {
        bucket: config.bucketName,
        region: config.region,
        accessKeyId: config.accessKeyId.substring(0, 8) + '...',
        error: 'Browser environment detected'
      }
    };
  }

  // Parse CSV content into array of objects
  static parseCSV(csvContent: string): Record<string, any>[] {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return [];
      }

      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
        const row: Record<string, any> = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        rows.push(row);
      }

      return rows;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
