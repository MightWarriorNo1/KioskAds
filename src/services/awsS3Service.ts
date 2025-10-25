import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3ProxyService } from './s3ProxyService';

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
  private static createS3Client(config: S3Config): S3Client {
    return new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  // List objects in S3 bucket with optional prefix
  static async listObjects(
    _config: S3Config, 
    prefix: string = '', 
    maxKeys: number = 1000
  ): Promise<S3Object[]> {
    try {
      // Use S3ProxyService to avoid CORS issues
      const proxyObjects = await S3ProxyService.listObjects({
        prefix: prefix,
        maxKeys: maxKeys,
      });

      return proxyObjects.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      }));
    } catch (error) {
      console.error('Error listing S3 objects via proxy:', error);
      throw new Error(`Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get object metadata
  static async getObjectMetadata(config: S3Config, key: string): Promise<{
    contentLength?: number;
    lastModified?: Date;
    contentType?: string;
    etag?: string;
  }> {
    try {
      const s3Client = this.createS3Client(config);
      
      const command = new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      return {
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        etag: response.ETag,
      };
    } catch (error) {
      console.error('Error getting object metadata:', error);
      throw new Error(`Failed to get object metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Download object as text (for CSV files)
  static async getObjectAsText(_config: S3Config, key: string): Promise<string> {
    try {
      // Use S3ProxyService to avoid CORS issues
      return await S3ProxyService.getObject(key);
    } catch (error) {
      console.error('Error downloading object as text via proxy:', error);
      throw new Error(`Failed to download object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate presigned URL for object access
  static async getPresignedUrl(
    config: S3Config, 
    key: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const s3Client = this.createS3Client(config);
      
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test S3 connection and permissions
  static async testConnection(config: S3Config): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> {
    try {
      // Test connection using proxy service
      const result = await S3ProxyService.testConnection();
      
      return {
        success: result.success,
        message: result.message,
        details: {
          bucket: config.bucketName,
          region: config.region,
          accessKeyId: config.accessKeyId.substring(0, 8) + '...',
          ...result.details,
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `S3 connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          bucket: config.bucketName,
          region: config.region,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Parse CSV content into array of objects
  static parseCSV(csvContent: string): Record<string, string>[] {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return [];
      }

      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};

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





