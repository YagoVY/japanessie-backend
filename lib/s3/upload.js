const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');

class S3UploadService {
  constructor(config) {
    this.s3Client = new S3Client({
      region: config?.region || process.env.AWS_REGION,
      credentials: {
        accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucketName = config?.bucketName || process.env.S3_BUCKET_NAME;
  }

  /**
   * Upload print PNG buffer to S3 and return public URL
   * Uses the same bucket/prefix as current logs: orders/order-<id>-item-<id>/<hash>/print.png
   */
  async uploadPrint(buffer, key) {
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
          CacheControl: 'public, max-age=31536000, immutable' // Cache for 1 year
        }
      });

      await upload.done();
      
      // Return public URL
      const region = process.env.AWS_REGION;
      const publicUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
      console.log(`[S3] ✅ Uploaded public object: s3://${this.bucketName}/${key}`);
      return publicUrl;
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
  generatePrintKey(orderId, lineItemId, buffer) {
    // Generate hash from buffer content for uniqueness
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
    return `orders/order-${orderId}-item-${lineItemId}/${hash}/print.png`;
  }

  /**
   * Upload print PNG with auto-generated key
   */
  async uploadPrintWithKey(buffer, orderId, lineItemId) {
    const key = this.generatePrintKey(orderId, lineItemId, buffer);
    const publicUrl = await this.uploadPrint(buffer, key);
    return {
      key,
      publicUrl
    };
  }

  /**
   * Upload any buffer to S3 with custom key
   */
  async uploadBuffer(buffer, key, contentType = 'application/octet-stream', metadata = {}) {
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
  async fileExists(key) {
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

// Export singleton instance (lazy initialization)
let s3UploadService = null;

function getS3UploadService() {
  if (!s3UploadService) {
    s3UploadService = new S3UploadService();
  }
  return s3UploadService;
}

module.exports = {
  get s3UploadService() {
    return getS3UploadService();
  },
  S3UploadService
};
