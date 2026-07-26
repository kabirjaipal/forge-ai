import { Response } from 'express';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { extractStructuredData, TemplateType } from '../services/extractionService.js';

export const handleExtraction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;

  const { documentId, rawText, templateType, customSchema } = req.body as {
    documentId?: string;
    rawText?: string;
    templateType?: TemplateType;
    customSchema?: string;
  };

  if (!templateType) {
    throw new AppError('templateType is required (invoice, resume, meeting, custom)', 400, 'INVALID_INPUT');
  }

  const result = await extractStructuredData({
    workspaceId,
    userId: req.user.id,
    documentId,
    rawText,
    templateType,
    customSchema,
  });

  res.json({ success: true, data: result });
});
