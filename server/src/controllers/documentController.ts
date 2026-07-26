import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
  getExtension,
  isAllowedFileType,
} from '../services/documentService.js';

// Configure local disk storage for Phase 1 (swap to S3 in Phase 2)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

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

export const listDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;
  const docs = await getDocuments(workspaceId, req.user.id);
  res.json({ success: true, data: docs });
});

export const getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const doc = await getDocumentById(id, workspaceId, req.user.id);
  res.json({ success: true, data: doc });
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
      const workspaceId = req.params['workspaceId']!;
      const ext = getExtension(req.file.originalname);
      const doc = await createDocument({
        workspaceId,
        userId: req.user.id,
        name: req.body['name'] || req.file.originalname,
        fileKey: req.file.filename,
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
