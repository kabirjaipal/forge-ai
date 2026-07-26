import path from 'path';
import fs from 'fs/promises';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { chunkText, generateEmbeddings } from './embeddingService.js';

const ALLOWED_FILE_TYPES = ['pdf', 'docx', 'md', 'csv', 'txt'] as const;
type FileType = (typeof ALLOWED_FILE_TYPES)[number];

export interface UploadDocumentInput {
  workspaceId: string;
  userId: string;
  name: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
}

export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase().replace('.', '');
}

export function isAllowedFileType(ext: string): ext is FileType {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(ext);
}

/**
 * Strips null bytes (0x00) and unsupported UTF-8 control characters that cause
 * PostgreSQL encoding error 22021 during database insertion.
 */
function sanitizeUtf8Text(input: string): string {
  if (!input) return '';
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code !== 0 && (code >= 32 || code === 9 || code === 10 || code === 13)) {
      result += input[i];
    }
  }
  return result;
}

export async function getDocuments(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Workspace not found or access denied', 403, 'FORBIDDEN');

  return prisma.document.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocumentById(id: string, workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const doc = await prisma.document.findFirst({
    where: { id, workspaceId },
    include: { _count: { select: { chunks: true } } },
  });
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
  return doc;
}

export async function createDocument(input: UploadDocumentInput) {
  const { workspaceId, userId, name, fileKey, fileType, fileSize } = input;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const document = await prisma.document.create({
    data: {
      workspaceId,
      name,
      fileKey,
      fileType,
      fileSize,
      status: 'pending',
    },
  });

  // Trigger async background processing for text extraction & vector embedding generation
  processDocumentAsync(document.id).catch((err) => {
    console.error(`[DocumentService] Error processing document ${document.id}:`, err);
  });

  return document;
}

/**
 * Asynchronously extracts text from uploaded document, chunks it,
 * generates vector embeddings, and persists chunks to the database.
 */
export async function processDocumentAsync(documentId: string) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return;

    const filePath = path.join(process.cwd(), 'uploads', doc.fileKey);
    let rawText = '';

    try {
      rawText = await fs.readFile(filePath, 'utf-8');
    } catch {
      rawText = `Document Name: ${doc.name}\nType: ${doc.fileType}`;
    }

    // Sanitize text to prevent PostgreSQL null byte 0x00 errors
    const extractedText = sanitizeUtf8Text(rawText);

    if (!extractedText || extractedText.trim().length === 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'completed' },
      });
      return;
    }

    // 1. Chunk document text
    const chunks = chunkText(extractedText, 500, 50);

    if (chunks.length > 0) {
      // 2. Generate vector embeddings for chunks
      const chunkTexts = chunks.map((c) => sanitizeUtf8Text(c.text));
      const embeddings = await generateEmbeddings(chunkTexts);

      // 3. Save chunks into database
      await prisma.documentChunk.createMany({
        data: chunks.map((chunk, idx) => ({
          documentId: doc.id,
          chunkIndex: chunk.index,
          content: sanitizeUtf8Text(chunk.text),
          metadata: { documentName: doc.name, fileType: doc.fileType },
          embedding: JSON.stringify(embeddings[idx] || []),
        })),
      });
    }

    // 4. Update status to completed
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process document text and embeddings';
    console.error(`[DocumentService] Document processing failed for ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'error',
        errorMessage: message,
      },
    });
  }
}

export async function deleteDocument(id: string, workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const doc = await prisma.document.findFirst({ where: { id, workspaceId } });
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  try {
    const filePath = path.join(process.cwd(), 'uploads', doc.fileKey);
    await fs.unlink(filePath);
  } catch {
    // File may not exist locally
  }

  await prisma.document.delete({ where: { id } });
  return { deleted: true };
}
