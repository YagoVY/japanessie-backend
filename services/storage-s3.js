// services/storage-s3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Accept both naming styles (NAME vs no NAME) to avoid future mismatches
const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;
const region = process.env.S3_REGION || process.env.S3_BUCKET_REGION;

// Optional: override public URL base if you use CDN or static site
const baseUrl =
  process.env.S3_PUBLIC_BASE_URL ||
  (bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : null);

function assertConfigured() {
  const missing = [];
  if (!bucket) missing.push('S3_BUCKET (or S3_BUCKET_NAME)');
  if (!region) missing.push('S3_REGION (or S3_BUCKET_REGION)');
  // creds can come from env/role; only warn if both missing
  const hasKey = !!process.env.S3_ACCESS_KEY_ID || !!process.env.AWS_ACCESS_KEY_ID;
  const hasSecret = !!process.env.S3_SECRET_ACCESS_KEY || !!process.env.AWS_SECRET_ACCESS_KEY;
  if (!hasKey || !hasSecret) missing.push('AWS/S3 credentials');
  if (missing.length) {
    const snapshot = {
      bucket_envs_seen: {
        S3_BUCKET: !!process.env.S3_BUCKET,
        S3_BUCKET_NAME: !!process.env.S3_BUCKET_NAME
      },
      region_envs_seen: {
        S3_REGION: !!process.env.S3_REGION,
        S3_BUCKET_REGION: !!process.env.S3_BUCKET_REGION
      },
      has_key: hasKey,
      has_secret: hasSecret
    };
    const message = `S3 not configured: missing ${missing.join(', ')}`;
    const error = new Error(message);
    error.details = snapshot;
    throw error;
  }
}

let s3 = null;
function getS3() {
  if (!s3) {
    assertConfigured();
    // Prefer S3_* but also accept AWS_* naming
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    s3 = new S3Client({
      region,
      credentials: (accessKeyId && secretAccessKey)
        ? { accessKeyId, secretAccessKey }
        : undefined // allow IAM role if deployed that way
    });
  }
  return s3;
}

/**
 * Uploads a buffer to S3 and returns a public URL.
 * @param {Buffer} buffer
 * @param {string} key - e.g. prints/{orderId}/{lineItemId}-{preset}-{ts}.png
 * @param {string} contentType - default 'image/png'
 * @returns {Promise<{ url: string, key: string }>}
 */
async function uploadPrintFile(buffer, key, contentType = 'image/png') {
  assertConfigured();

  const s3Client = getS3();
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read' // ensure your bucket policy allows this, or remove and serve via signed URLs/CDN
  }));

  const url = baseUrl
    ? `${baseUrl}/${encodeURIComponent(key)}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

  return { url, key };
}

module.exports = { uploadPrintFile };
