import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { listDocuments, getDocument, uploadDocument, removeDocument } from '../controllers/documentController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listDocuments);
router.post('/', authenticate, uploadDocument);
router.get('/:id', authenticate, getDocument);
router.delete('/:id', authenticate, removeDocument);

export default router;
