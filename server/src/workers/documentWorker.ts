import { Worker, Job } from 'bullmq';
import { DOCUMENT_QUEUE_NAME } from '../lib/queue.js';
import { getRedisClient, isRealRedisAvailable } from '../lib/redis.js';
import { processDocumentAsync } from '../services/documentService.js';

interface DocumentJobData {
  documentId: string;
  workspaceId: string;
}

let documentWorker: Worker | null = null;

export function initDocumentWorker() {
  if (!isRealRedisAvailable()) {
    console.log('ℹ️ REDIS_URL not set — BullMQ document worker disabled (direct processing active).');
    return;
  }
  try {
    const connection = getRedisClient();

    documentWorker = new Worker<DocumentJobData>(
      DOCUMENT_QUEUE_NAME,
      async (job: Job<DocumentJobData>) => {
        const { documentId } = job.data;
        console.log(`[DocumentWorker] Processing job ${job.id} for document: ${documentId}`);
        await processDocumentAsync(documentId);
      },
      {
        connection,
        concurrency: 5,
      }
    );

    documentWorker.on('completed', (job: Job) => {
      console.log(`[DocumentWorker] Job ${job.id} completed successfully`);
    });

    documentWorker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`[DocumentWorker] Job ${job?.id} failed with error: ${err.message}`);
    });

    console.log(`⚡ In-Memory BullMQ Worker initialized for '${DOCUMENT_QUEUE_NAME}'`);
  } catch (err: any) {
    console.warn(`[DocumentWorker] Failed to initialize worker: ${err.message}`);
  }
}
