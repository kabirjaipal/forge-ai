import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listTools,
  createCustomTool,
  updateCustomTool,
  deleteCustomTool,
  testCustomTool,
} from '../controllers/toolController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listTools);
router.post('/', authenticate, createCustomTool);
router.put('/:id', authenticate, updateCustomTool);
router.delete('/:id', authenticate, deleteCustomTool);
router.post('/:id/test', authenticate, testCustomTool);

export default router;
