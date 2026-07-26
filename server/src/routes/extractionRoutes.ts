import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { handleExtraction } from '../controllers/extractionController.js';

const router = Router({ mergeParams: true });

router.post('/', authenticate, handleExtraction);

export default router;
