import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { listMcpTools, handleMcpRpc } from '../controllers/mcpController.js';

const router = Router({ mergeParams: true });

router.get('/tools', authenticate, listMcpTools);
router.post('/rpc', authenticate, handleMcpRpc);
router.post('/', authenticate, handleMcpRpc);

export default router;
