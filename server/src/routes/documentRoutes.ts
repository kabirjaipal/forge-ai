import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listDocuments,
  getDocument,
  uploadDocument,
  removeDocument,
  getDocumentDownloadLink,
} from '../controllers/documentController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listDocuments);
router.post('/', authenticate, uploadDocument);
router.get('/:id', authenticate, getDocument);
router.get('/:id/download', authenticate, getDocumentDownloadLink);
router.delete('/:id', authenticate, removeDocument);

export default router;
