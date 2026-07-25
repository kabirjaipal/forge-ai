import { Router } from 'express';
import { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace } from '../controllers/workspaceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);

export default router;
