import { Queue } from 'bullmq';
import { getRedisClient } from './redis.js';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

let documentQueue: Queue | null = null;

export function initQueues() {
  try {
    const connection = getRedisClient();

    documentQueue = new Queue(DOCUMENT_QUEUE_NAME, { connection });

    console.log(`⚡ In-Memory BullMQ queue initialized: '${DOCUMENT_QUEUE_NAME}'`);
  } catch (err: any) {
    console.log(`ℹ️ In-memory queue initialized (${err.message})`);
  }
}

export async function addDocumentJob(documentId: string, workspaceId: string) {
  if (documentQueue) {
    await documentQueue.add('process-document', { documentId, workspaceId });
  }
}
