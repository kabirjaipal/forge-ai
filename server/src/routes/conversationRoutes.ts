import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listConversations,
  getConversation,
  createConversationHandler,
  deleteConversationHandler,
  addMessageHandler,
  streamChatHandler,
  getAnalyticsHandler,
} from '../controllers/conversationController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listConversations);
router.post('/', authenticate, createConversationHandler);
router.get('/analytics', authenticate, getAnalyticsHandler);
router.get('/:id', authenticate, getConversation);
router.delete('/:id', authenticate, deleteConversationHandler);
router.post('/:id/messages', authenticate, addMessageHandler);
router.post('/:id/stream', authenticate, streamChatHandler);

export default router;
