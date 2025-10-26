import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    config: S3Config, 
    prefix: string = '', 
    maxKeys: number = 1000
  ): Promise<S3Object[]> {
    try {
      const s3Client = this.createS3Client(config);
      
      const command = new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents.map(obj => ({
        key: obj.Key || '',
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      }));
    } catch (error) {
      console.error('Error listing S3 objects:', error);
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
  static async getObjectAsText(config: S3Config, key: string): Promise<string> {
    try {
      const s3Client = this.createS3Client(config);
      
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No body in response');
      }

      // Convert stream to text
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new TextDecoder().decode(buffer);
    } catch (error) {
      console.error('Error downloading object as text:', error);
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
  static async testConnection(config: S3Config, options?: { prefix?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const s3Client = this.createS3Client(config);
      
      // Try to list objects to test connection and permissions
      const command = new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: options?.prefix ?? '',
        MaxKeys: 1,
      });

      const response = await s3Client.send(command);
      
      return {
        success: true,
        message: 'S3 connection test successful!',
        details: {
          bucket: config.bucketName,
          region: config.region,
          accessKeyId: config.accessKeyId.substring(0, 8) + '...',
          objectCount: response.KeyCount || 0,
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





