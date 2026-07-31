import { Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
  getExtension,
  isAllowedFileType,
  getDocumentDownloadUrl,
  documentEventEmitter,
} from '../services/documentService.js';
import { uploadFileToStorage } from '../lib/storage.js';

const storage = multer.memoryStorage();

const fileFilter = (_req: unknown, file: { originalname: string }, cb: multer.FileFilterCallback) => {
  const ext = getExtension(file.originalname);
  if (!isAllowedFileType(ext)) {
    cb(new AppError(`File type .${ext} is not allowed. Allowed: pdf, docx, md, csv, txt`, 400, 'INVALID_FILE_TYPE'));
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).single('file');

function getParamStr(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? (param[0] || '') : param;
}

export const listDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
  const docs = await getDocuments(workspaceId, req.user.id);
  res.json({ success: true, data: docs });
});

export const getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const doc = await getDocumentById(id, workspaceId, req.user.id);
  res.json({ success: true, data: doc });
});

export const getDocumentDownloadLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const url = await getDocumentDownloadUrl(id, workspaceId, req.user.id);
  res.json({ success: true, data: { downloadUrl: url } });
});

export const uploadDocument = (req: AuthRequest, res: Response) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      const status = err instanceof AppError ? err.status : 400;
      const code = err instanceof AppError ? err.code : 'UPLOAD_ERROR';
      res.status(status).json({ success: false, error: { code, message: err.message } });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } });
      return;
    }

    try {
      const workspaceId = getParamStr(req.params['workspaceId']);
      const ext = getExtension(req.file.originalname);
      const fileKey = `${uuidv4()}.${ext}`;

      // Upload raw file buffer to S3
      await uploadFileToStorage(fileKey, req.file.buffer, req.file.mimetype);

      const doc = await createDocument({
        workspaceId,
        userId: req.user.id,
        name: req.body['name'] || req.file.originalname,
        fileKey,
        fileType: ext,
        fileSize: req.file.size,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: { code: error.code || 'INTERNAL_ERROR', message: error.message },
      });
    }
  });
};

export const removeDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  await deleteDocument(id, workspaceId, req.user.id);
  res.json({ success: true, data: { deleted: true } });
});

export const streamDocumentEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  };

  sendEvent({ type: 'connected', workspaceId });

  const onUpdate = (eventData: any) => {
    if (eventData.workspaceId === workspaceId) {
      sendEvent(eventData);
    }
  };

  documentEventEmitter.on('document_update', onUpdate);

  req.on('close', () => {
    documentEventEmitter.off('document_update', onUpdate);
  });
});
