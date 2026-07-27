import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';
import config from './config.js';
import logger from './logger.js';

const endpoint = config.S3_ENDPOINT.startsWith('http')
  ? config.S3_ENDPOINT
  : `https://${config.S3_ENDPOINT}`;

export const s3Client = new S3Client({
  endpoint,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
});

const BUCKET_NAME = config.S3_BUCKET;
const localUploadDir = path.join(process.cwd(), 'uploads');

let isBucketReady = false;

export async function ensureBucketExists(): Promise<boolean> {
  if (isBucketReady) return true;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    isBucketReady = true;
    logger.info(`[S3 Storage] Bucket '${BUCKET_NAME}' is ready.`);
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        isBucketReady = true;
        logger.info(`[S3 Storage] Created bucket '${BUCKET_NAME}'.`);
        return true;
      } catch (createErr) {
        logger.warn({ err: createErr }, `[S3 Storage] Failed to create bucket '${BUCKET_NAME}'. Falling back to local storage.`);
        return false;
      }
    }
    logger.warn(`[S3 Storage] Storage server unreachable at ${endpoint}. Falling back to local storage.`);
    return false;
  }
}

export async function uploadFileToStorage(fileKey: string, buffer: Buffer, contentType?: string): Promise<boolean> {
  const hasBucket = await ensureBucketExists();
  if (hasBucket) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
        })
      );
      logger.info(`[S3 Storage] Uploaded '${fileKey}' to S3 bucket.`);
      return true;
    } catch (err) {
      logger.error({ err }, `[S3 Storage] Upload to S3 failed for '${fileKey}'. Writing to local disk fallback.`);
    }
  }


  // Local disk fallback
  await fs.mkdir(localUploadDir, { recursive: true });
  await fs.writeFile(path.join(localUploadDir, fileKey), buffer);
  logger.info(`[Local Storage Fallback] Saved '${fileKey}' to disk.`);
  return false;
}

export async function getFileBufferFromStorage(fileKey: string): Promise<Buffer> {
  const hasBucket = await ensureBucketExists();
  if (hasBucket) {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
      if (response.Body) {
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      }
    } catch (err) {
      logger.warn(`[S3 Storage] Fetch from S3 failed for '${fileKey}'. Trying local disk fallback.`);
    }
  }

  // Local disk fallback
  const localPath = path.join(localUploadDir, fileKey);
  return await fs.readFile(localPath);
}

export async function deleteFileFromStorage(fileKey: string): Promise<void> {
  const hasBucket = await ensureBucketExists();
  if (hasBucket) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
      logger.info(`[S3 Storage] Deleted '${fileKey}' from S3.`);
    } catch (err) {
      logger.warn(`[S3 Storage] Failed to delete '${fileKey}' from S3.`);
    }
  }

  try {
    await fs.unlink(path.join(localUploadDir, fileKey));
  } catch {
    // Ignore local file delete errors
  }
}

export async function getPresignedUrlFromStorage(fileKey: string, expiresIn = 3600): Promise<string> {
  const hasBucket = await ensureBucketExists();
  if (hasBucket) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
      logger.warn(`[S3 Storage] Presigned URL generation failed for '${fileKey}'.`);
    }
  }
  return `/api/v1/workspaces/documents/file/${fileKey}`;
}
