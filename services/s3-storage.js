require('dotenv').config();

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class S3StorageService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  async storeDesignFiles(orderId, designBuffers) {
    // Store multiple files: print-ready, preview, validation
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseKey = `designs/${orderId}/${timestamp}`;
    
    const uploadPromises = [];
    const results = {};

    // Upload print-ready file (300 DPI)
    if (designBuffers.printReady) {
      const printKey = `${baseKey}/print-ready.png`;
      uploadPromises.push(
        this.uploadBuffer(printKey, designBuffers.printReady, 'image/png', {
          orderId,
          type: 'print-ready',
          dpi: '300',
          timestamp
        }).then(url => { results.printReadyUrl = url; })
      );
    }

    // Upload preview file (72 DPI)
    if (designBuffers.preview) {
      const previewKey = `${baseKey}/preview.png`;
      uploadPromises.push(
        this.uploadBuffer(previewKey, designBuffers.preview, 'image/png', {
          orderId,
          type: 'preview',
          dpi: '72',
          timestamp
        }).then(url => { results.previewUrl = url; })
      );
    }

    // Upload validation mockup
    if (designBuffers.mockup) {
      const mockupKey = `${baseKey}/mockup.png`;
      uploadPromises.push(
        this.uploadBuffer(mockupKey, designBuffers.mockup, 'image/png', {
          orderId,
          type: 'mockup',
          timestamp
        }).then(url => { results.mockupUrl = url; })
      );
    }

    // Upload design metadata as JSON
    if (designBuffers.metadata) {
      const metadataKey = `${baseKey}/metadata.json`;
      const metadataBuffer = Buffer.from(JSON.stringify(designBuffers.metadata, null, 2));
      uploadPromises.push(
        this.uploadBuffer(metadataKey, metadataBuffer, 'application/json', {
          orderId,
          type: 'metadata',
          timestamp
        }).then(url => { results.metadataUrl = url; })
      );
    }

    await Promise.all(uploadPromises);
    
    return {
      orderId,
      timestamp,
      baseKey,
      ...results
    };
  }

  async uploadBuffer(key, buffer, contentType, metadata = {}) {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: {
            ...Object.fromEntries(
              Object.entries(metadata).map(([key, value]) => [key, String(value)])
            ),
            uploadedAt: new Date().toISOString()
          },
          // Set appropriate cache control for different file types
          CacheControl: contentType === 'application/json' ? 'no-cache' : 'max-age=31536000'
        }
      });

      await upload.done();
      
      // Generate a presigned URL that's publicly accessible for 24 hours
      const presignedUrl = await this.getPresignedUrl(key, 24 * 60 * 60); // 24 hours
      
      return presignedUrl;
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`S3 upload failed for key ${key}: ${errorMessage}`);
      throw new Error(`Failed to upload ${key} to S3: ${errorMessage}`);
    }
  }

  async getPresignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return presignedUrl;
    } catch (error) {
      console.error(`Failed to generate presigned URL for ${key}:`, error.message);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  async getFileUrl(orderId, fileType = 'print-ready') {
    // Get the most recent file of specified type for an order
    const prefix = `designs/${orderId}/`;
    
    try {
      // List objects to find the most recent
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(listCommand);
      
      if (!response.Contents || response.Contents.length === 0) {
        throw new Error(`No files found for order ${orderId}`);
      }

      // Find the most recent timestamp directory
      const timestampDirs = response.Contents
        .map(obj => obj.Key.split('/')[2])
        .filter(Boolean)
        .sort()
        .reverse();

      if (timestampDirs.length === 0) {
        throw new Error(`No timestamped directories found for order ${orderId}`);
      }

      const latestTimestamp = timestampDirs[0];
      const fileKey = `${prefix}${latestTimestamp}/${fileType}.${fileType === 'metadata' ? 'json' : 'png'}`;
      
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Failed to get file URL for order ${orderId}: ${errorMessage}`);
      throw error;
    }
  }

  async downloadFile(orderId, fileType = 'print-ready') {
    const fileUrl = await this.getFileUrl(orderId, fileType);
    const key = fileUrl.split('.amazonaws.com/')[1];
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const response = await this.s3Client.send(getCommand);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Failed to download file ${key}: ${errorMessage}`);
      throw error;
    }
  }

  async fileExists(orderId, fileType = 'print-ready') {
    try {
      const fileUrl = await this.getFileUrl(orderId, fileType);
      const key = fileUrl.split('.amazonaws.com/')[1];
      
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      await this.s3Client.send(headCommand);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async cleanupOldFiles(orderId, keepLatestN = 3) {
    // Clean up old design files, keeping only the latest N versions
    const prefix = `designs/${orderId}/`;
    
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix
      });
      
      const response = await this.s3Client.send(listCommand);
      
      if (!response.Contents || response.Contents.length === 0) {
        return;
      }

      // Group by timestamp directory and sort
      const timestampGroups = {};
      response.Contents.forEach(obj => {
        const pathParts = obj.Key.split('/');
        if (pathParts.length >= 3) {
          const timestamp = pathParts[2];
          if (!timestampGroups[timestamp]) {
            timestampGroups[timestamp] = [];
          }
          timestampGroups[timestamp].push(obj);
        }
      });

      const timestamps = Object.keys(timestampGroups).sort().reverse();
      const timestampsToDelete = timestamps.slice(keepLatestN);

      // Delete old files
      const deletePromises = [];
      timestampsToDelete.forEach(timestamp => {
        timestampGroups[timestamp].forEach(obj => {
          deletePromises.push(
            this.s3Client.send(new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: obj.Key
            }))
          );
        });
      });

      await Promise.all(deletePromises);
      
      console.log(`Cleaned up ${deletePromises.length} old files for order ${orderId}`);
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Failed to cleanup old files for order ${orderId}: ${errorMessage}`);
      // Don't throw - cleanup failure shouldn't break the main flow
    }
  }

  generatePresignedUrl(key, expiresIn = 3600) {
    // Generate presigned URL for temporary access
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });
    
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async downloadFileByKey(key) {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const response = await this.s3Client.send(getCommand);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Failed to download file ${key}: ${errorMessage}`);
      throw error;
    }
  }
}

module.exports = S3StorageService;
