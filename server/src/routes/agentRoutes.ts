import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listAgents,
  getAgent,
  createAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  listTools,
} from '../controllers/agentController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listAgents);
router.post('/', authenticate, createAgentHandler);
router.get('/tools', authenticate, listTools);
router.get('/:id', authenticate, getAgent);
router.put('/:id', authenticate, updateAgentHandler);
router.delete('/:id', authenticate, deleteAgentHandler);

export default router;
