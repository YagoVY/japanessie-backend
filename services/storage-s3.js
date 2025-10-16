// services/storage-s3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const baseUrl = process.env.S3_PUBLIC_BASE_URL || (bucket && region
  ? `https://${bucket}.s3.${region}.amazonaws.com`
  : null);

let s3 = null;
function getS3() {
  if (!s3) {
    s3 = new S3Client({
      region,
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
          }
        : undefined
    });
  }
  return s3;
}

/**
 * Uploads a buffer to S3 and returns a public URL.
 * @param {Buffer} buffer
 * @param {string} key - path/filename.png
 * @param {string} contentType - 'image/png'
 * @returns {Promise<{ url: string, key: string }>}
 */
async function uploadPrintFile(buffer, key, contentType = 'image/png') {
  if (!bucket || !region) {
    throw new Error('S3 not configured: set S3_BUCKET and S3_REGION (and credentials)');
  }
  const s3Client = getS3();
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read' // Public URL; ensure bucket policy allows it
  }));
  const url = baseUrl ? `${baseUrl}/${encodeURIComponent(key)}` : `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  return { url, key };
}

module.exports = { uploadPrintFile };
