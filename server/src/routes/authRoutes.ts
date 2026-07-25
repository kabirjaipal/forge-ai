import { Router } from 'express';
import { getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me', authenticate, getMe);

export default router;
