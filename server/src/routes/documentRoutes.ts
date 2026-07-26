import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listDocuments,
  getDocument,
  uploadDocument,
  removeDocument,
  getDocumentDownloadLink,
  streamDocumentEvents,
} from '../controllers/documentController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listDocuments);
router.get('/events', authenticate, streamDocumentEvents);
router.post('/', authenticate, uploadDocument);
router.get('/:id', authenticate, getDocument);
router.get('/:id/download', authenticate, getDocumentDownloadLink);
router.delete('/:id', authenticate, removeDocument);

export default router;
