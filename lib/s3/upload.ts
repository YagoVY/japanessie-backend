import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';

interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

class S3UploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config?: Partial<S3Config>) {
    this.s3Client = new S3Client({
      region: config?.region || process.env.AWS_REGION,
      credentials: {
        accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    this.bucketName = config?.bucketName || process.env.S3_BUCKET_NAME!;
  }

  /**
   * Upload print PNG buffer to S3 and return public URL
   * Uses the same bucket/prefix as current logs: orders/order-<id>-item-<id>/<hash>/print.png
   */
  async uploadPrint(buffer: Buffer, key: string): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
          Metadata: {
            uploadedAt: new Date().toISOString(),
            type: 'print-png',
            size: buffer.length.toString()
          },
          CacheControl: 'max-age=31536000' // Cache for 1 year
        }
      });

      await upload.done();
      
      // Return public URL
      const region = process.env.AWS_REGION;
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`S3 upload failed for key ${key}: ${errorMessage}`);
      throw new Error(`Failed to upload print PNG to S3: ${errorMessage}`);
    }
  }

  /**
   * Generate a unique key for print PNG upload
   * Format: orders/order-<id>-item-<id>/<hash>/print.png
   */
  generatePrintKey(orderId: string, lineItemId: string, buffer: Buffer): string {
    // Generate hash from buffer content for uniqueness
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
    return `orders/order-${orderId}-item-${lineItemId}/${hash}/print.png`;
  }

  /**
   * Upload print PNG with auto-generated key
   */
  async uploadPrintWithKey(buffer: Buffer, orderId: string, lineItemId: string): Promise<string> {
    const key = this.generatePrintKey(orderId, lineItemId, buffer);
    return await this.uploadPrint(buffer, key);
  }

  /**
   * Upload any buffer to S3 with custom key
   */
  async uploadBuffer(
    buffer: Buffer, 
    key: string, 
    contentType: string = 'application/octet-stream',
    metadata: Record<string, string> = {}
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            size: buffer.length.toString()
          }
        }
      });

      await upload.done();
      
      const region = process.env.AWS_REGION;
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`S3 upload failed for key ${key}: ${errorMessage}`);
      throw new Error(`Failed to upload buffer to S3: ${errorMessage}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      // Try to get object metadata
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const s3UploadService = new S3UploadService();
export default S3UploadService;
