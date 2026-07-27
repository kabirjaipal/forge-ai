import { Queue } from 'bullmq';
import { getRedisClient, isRealRedisAvailable } from './redis.js';
import { processDocumentAsync } from '../services/documentService.js';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

let documentQueue: Queue | null = null;

export function initQueues() {
  if (!isRealRedisAvailable()) {
    console.log('ℹ️ REDIS_URL not set — BullMQ queue disabled, using direct processing fallback.');
    return;
  }
  try {
    const connection = getRedisClient();
    documentQueue = new Queue(DOCUMENT_QUEUE_NAME, { connection });
    console.log(`⚡ BullMQ queue initialized: '${DOCUMENT_QUEUE_NAME}'`);
  } catch (err: any) {
    console.warn(`ℹ️ Failed to initialize BullMQ queue: (${err.message})`);
  }
}

export async function addDocumentJob(documentId: string, workspaceId: string) {
  if (documentQueue) {
    await documentQueue.add('process-document', { documentId, workspaceId });
  } else {
    // Direct async processing fallback when Redis is omitted
    processDocumentAsync(documentId).catch((err) => {
      console.error(`[Direct Processing Fallback] Failed for document ${documentId}:`, err);
    });
  }
}
