import path from 'path';
import fs from 'fs/promises';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { chunkText, generateEmbeddings } from './embeddingService.js';
import {
  getFileBufferFromStorage,
  deleteFileFromStorage,
  getPresignedUrlFromStorage,
} from '../lib/storage.js';

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
 * Strips null bytes (0x00), lone surrogate pairs, and non-printable UTF-8 control characters
 * that cause Prisma Rust JSON engine error "lone leading surrogate in hex escape".
 */
function sanitizeUtf8Text(input: string): string {
  if (!input) return '';
  // 1. Convert to well-formed string, removing lone surrogates
  const safe = typeof (input as any).toWellFormed === 'function'
    ? (input as any).toWellFormed()
    : input.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

  // 2. Remove null bytes and non-printable control characters
  return safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Cleans extracted text from PDF/binary wrappers, stripping PDF stream metadata,
 * FlateDecode tags, and object stream markers.
 */
function cleanExtractedText(raw: string, fileType: string): string {
  if (!raw) return '';
  const sanitized = sanitizeUtf8Text(raw);
  if (fileType.toLowerCase() === 'pdf') {
    const lines = sanitized.split(/\r?\n/);
    const cleaned = lines
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        if (
          l.startsWith('%PDF-') ||
          l.includes('FlateDecode') ||
          l.includes('endstream') ||
          l.includes('endobj') ||
          l.includes('/Font') ||
          l.includes('/MediaBox') ||
          l.includes('/Filter') ||
          l.includes('/Type')
        ) {
          return false;
        }
        // Filter out lines that look like raw PDF object identifiers, e.g. "12 0 obj"
        if (/^\d+\s+\d+\s+obj$/.test(l)) return false;
        return true;
      })
      .join(' ');
    return sanitizeUtf8Text(cleaned);
  }
  return sanitized;
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

    let rawText = '';

    try {
      const buffer = await getFileBufferFromStorage(doc.fileKey);
      rawText = buffer.toString('utf-8');
    } catch {
      rawText = `Document Name: ${doc.name}\nType: ${doc.fileType}`;
    }

    // Clean text and strip PDF stream metadata & lone surrogates
    const extractedText = cleanExtractedText(rawText, doc.fileType);

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
      const chunkTexts = chunks.map((c) => cleanExtractedText(c.text, doc.fileType));
      const embeddings = await generateEmbeddings(chunkTexts);

      // 3. Save chunks into database with strict UTF-8 surrogate sanitization
      await prisma.documentChunk.createMany({
        data: chunks.map((chunk, idx) => ({
          documentId: doc.id,
          chunkIndex: chunk.index,
          content: cleanExtractedText(chunk.text, doc.fileType),
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
    await deleteFileFromStorage(doc.fileKey);
  } catch {
    // Ignore storage delete error
  }

  await prisma.document.delete({ where: { id } });
  return { deleted: true };
}

export async function getDocumentDownloadUrl(id: string, workspaceId: string, userId: string): Promise<string> {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const doc = await prisma.document.findFirst({ where: { id, workspaceId } });
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  return await getPresignedUrlFromStorage(doc.fileKey);
}
