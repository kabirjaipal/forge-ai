import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  getConversations,
  getConversationById,
  createConversation,
  deleteConversation,
  addMessage,
  getAnalytics,
} from '../services/conversationService.js';

const createConvoSchema = z.object({
  title: z.string().min(1).max(200),
  agentId: z.string().optional(),
});

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  citations: z.array(z.any()).optional(),
  toolCalls: z.array(z.any()).optional(),
});

export const listConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;
  const convos = await getConversations(workspaceId, req.user.id);
  res.json({ success: true, data: convos });
});

export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const convo = await getConversationById(id, workspaceId, req.user.id);
  res.json({ success: true, data: convo });
});

export const createConversationHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;
  const parsed = createConvoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  const convo = await createConversation(workspaceId, req.user.id, parsed.data.title, parsed.data.agentId);
  res.status(201).json({ success: true, data: convo });
});

export const deleteConversationHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  await deleteConversation(id, workspaceId, req.user.id);
  res.json({ success: true, data: { deleted: true } });
});

export const addMessageHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const parsed = addMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  const message = await addMessage(
    id,
    workspaceId,
    req.user.id,
    parsed.data.role,
    parsed.data.content,
    parsed.data.citations,
    parsed.data.toolCalls,
  );
  res.status(201).json({ success: true, data: message });
});

export const streamChatHandler = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    return;
  }

  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Message content is required' } });
    return;
  }

  try {
    // Store user message
    await addMessage(id, workspaceId, req.user.id, 'user', content);

    // Set up SSE headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Phase 1: Simulated streaming response (replace with real LLM in Phase 2)
    const simulatedResponse = `I'm ForgeAI's AI assistant! You said: "${content}"\n\nIn Phase 2, I'll connect to a real language model (Groq/OpenAI) and retrieve relevant context from your uploaded documents using RAG (Retrieval-Augmented Generation). For now, this confirms the streaming pipeline is working correctly.`;

    sendEvent('start', { conversationId: id });

    const words = simulatedResponse.split(' ');
    let accumulated = '';
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 30));
      const chunk = word + ' ';
      accumulated += chunk;
      sendEvent('chunk', { content: chunk });
    }

    // Store assistant message
    const assistantMsg = await addMessage(id, workspaceId, req.user.id, 'assistant', accumulated.trim());

    sendEvent('done', { messageId: assistantMsg.id, content: accumulated.trim() });
    res.end();
  } catch (error: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
    res.end();
  }
};

export const getAnalyticsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;
  const analytics = await getAnalytics(workspaceId, req.user.id);
  res.json({ success: true, data: analytics });
});
