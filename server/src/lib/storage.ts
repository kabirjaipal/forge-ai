import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
        logger.error({ err: createErr }, `[S3 Storage] Failed to create bucket '${BUCKET_NAME}'.`);
        throw createErr;
      }
    }
    logger.error({ err }, `[S3 Storage] Storage server unreachable at ${endpoint}.`);
    throw err;
  }
}

export async function uploadFileToStorage(fileKey: string, buffer: Buffer, contentType?: string): Promise<boolean> {
  await ensureBucketExists();
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
}

export async function getFileBufferFromStorage(fileKey: string): Promise<Buffer> {
  await ensureBucketExists();
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
  throw new Error(`File '${fileKey}' not found or empty in S3 storage.`);
}

export async function deleteFileFromStorage(fileKey: string): Promise<void> {
  await ensureBucketExists();
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })
  );
  logger.info(`[S3 Storage] Deleted '${fileKey}' from S3.`);
}

export async function getPresignedUrlFromStorage(fileKey: string, expiresIn = 3600): Promise<string> {
  await ensureBucketExists();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}
