import path from 'path';
import fs from 'fs/promises';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

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

export async function getDocuments(workspaceId: string, userId: string) {
  // Verify workspace membership
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

  // Verify workspace membership
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  return prisma.document.create({
    data: {
      workspaceId,
      name,
      fileKey,
      fileType,
      fileSize,
      status: 'pending',
    },
  });
}

export async function deleteDocument(id: string, workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const doc = await prisma.document.findFirst({ where: { id, workspaceId } });
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

  // Delete local file if it exists (Phase 1 — local storage)
  try {
    const filePath = path.join(process.cwd(), 'uploads', doc.fileKey);
    await fs.unlink(filePath);
  } catch {
    // File may not exist locally (e.g., already deleted or stored in S3)
  }

  await prisma.document.delete({ where: { id } });
  return { deleted: true };
}
