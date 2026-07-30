import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listConversations,
  getConversation,
  createConversationHandler,
  updateConversationHandler,
  deleteConversationHandler,
  deleteAllConversationsHandler,
  addMessageHandler,
  streamChatHandler,
  getAnalyticsHandler,
} from '../controllers/conversationController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listConversations);
router.post('/', authenticate, createConversationHandler);
router.delete('/', authenticate, deleteAllConversationsHandler);
router.get('/analytics', authenticate, getAnalyticsHandler);
router.get('/:id', authenticate, getConversation);
router.patch('/:id', authenticate, updateConversationHandler);
router.delete('/:id', authenticate, deleteConversationHandler);
router.post('/:id/messages', authenticate, addMessageHandler);
router.post('/:id/stream', authenticate, streamChatHandler);

export default router;
