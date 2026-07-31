import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  getConversations,
  getConversationById,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  deleteAllConversations,
  addMessage,
  getAnalytics,
} from '../services/conversationService.js';
import { searchRelevantChunks } from '../services/ragService.js';
import { runPureLangChainToolAgentStream } from '../services/langgraphService.js';

const createConvoSchema = z.object({
  title: z.string().min(1).max(200),
  agentId: z.string().optional(),
});

const updateConvoSchema = z.object({
  title: z.string().min(1).max(200),
});

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  citations: z.array(z.any()).optional(),
  toolCalls: z.array(z.any()).optional(),
});

function getParamStr(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? (param[0] || '') : param;
}

export const listConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
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
  const workspaceId = getParamStr(req.params['workspaceId']);
  const parsed = createConvoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  const convo = await createConversation(workspaceId, req.user.id, parsed.data.title, parsed.data.agentId);
  res.status(201).json({ success: true, data: convo });
});

export const updateConversationHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const parsed = updateConvoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  const updated = await updateConversationTitle(id, workspaceId, req.user.id, parsed.data.title);
  res.json({ success: true, data: updated });
});

export const deleteConversationHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  await deleteConversation(id, workspaceId, req.user.id);
  res.json({ success: true, data: { deleted: true } });
});

export const deleteAllConversationsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
  await deleteAllConversations(workspaceId, req.user.id);
  res.json({ success: true, data: { deletedAll: true } });
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

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  };

  try {
    // 1. Fetch conversation & attached agent details
    const conversation = await getConversationById(id, workspaceId, req.user.id);
    const agentId = conversation.agentId || undefined;

    // Auto-generate title from first user message if still default
    if (conversation.title === 'New Chat' || conversation.title === 'New Conversation') {
      const generatedTitle = content.trim().replace(/\n/g, ' ').slice(0, 35).trim() + (content.length > 35 ? '...' : '');
      if (generatedTitle) {
        await updateConversationTitle(id, workspaceId, req.user.id, generatedTitle);
      }
    }

    // 2. Store user message
    await addMessage(id, workspaceId, req.user.id, 'user', content);

    // 3. RAG: vector similarity search over agent-linked document chunks
    const ragMatches = await searchRelevantChunks(workspaceId, content, agentId, 4);

    const citations = ragMatches.map((match) => ({
      documentId: match.documentId,
      documentName: match.documentName,
      snippet: match.content,
      relevanceScore: Math.round(match.score * 100) / 100,
    }));

    let ragContextString = '';
    if (ragMatches.length > 0) {
      ragContextString = ragMatches
        .map((m, idx) => `[Document: "${m.documentName}" | Excerpt ${idx + 1}]\n${m.content}`)
        .join('\n\n');
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    sendEvent('start', { conversationId: id, ragMatchesCount: ragMatches.length });

    // 4. Sliding context window (last 14 messages)
    const SLIDING_WINDOW_SIZE = 14;
    const historyMessages = conversation.messages.slice(-SLIDING_WINDOW_SIZE);
    const previousMessages = historyMessages.map((m: (typeof historyMessages)[number]) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));

    previousMessages.push({ role: 'user', content });

    // Build system prompt with RAG context injected
    const baseSystemPrompt = conversation.agent?.systemPrompt || 'You are an intelligent AI Assistant.';
    let finalSystemPrompt = baseSystemPrompt;
    if (ragContextString.trim().length > 0) {
      finalSystemPrompt += `\n\n--- RETRIEVED DOCUMENT EXCERPTS (CHUNKS) ---\nNote: The items below are text excerpts (chunks) retrieved from workspace/agent documents. Multiple excerpts may belong to the same document file.\n\n${ragContextString.trim()}\n--- END EXCERPTS ---`;
    }

    const targetModel = conversation.agent?.model || 'llama-3.3-70b-versatile';
    const targetTemperature = conversation.agent?.temperature ?? 0.7;

    const toolIds = conversation.agent?.agentTools?.map((at: any) => at.toolId) || [];

    // 5. Pure LangChain Tool Agent Streaming Execution
    const finalResponseText = await runPureLangChainToolAgentStream({
      workspaceId,
      agentId,
      systemPrompt: finalSystemPrompt,
      model: targetModel,
      temperature: targetTemperature,
      messages: previousMessages,
      toolIds,
      onChunk: (chunkText) => {
        sendEvent('chunk', { content: chunkText });
      },
      onToolStart: (toolName, message) => {
        sendEvent('tool_start', { toolName, message });
      },
      onToolDone: (toolName, message, success) => {
        sendEvent('tool_done', { toolName, message, success });
      },
    });

    const tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    const MAX_CONTEXT_TOKENS = 128000;
    const contextStats = {
      usedTokens: tokenUsage.totalTokens,
      maxTokens: MAX_CONTEXT_TOKENS,
      remainingTokens: MAX_CONTEXT_TOKENS - tokenUsage.totalTokens,
      percentage: Number(((tokenUsage.totalTokens / MAX_CONTEXT_TOKENS) * 100).toFixed(2)),
    };

    // 6. Store final assistant message with citations & token usage
    const assistantMsg = await addMessage(
      id,
      workspaceId,
      req.user.id,
      'assistant',
      finalResponseText,
      citations.length > 0 ? citations : undefined,
      { tokenUsage },
    );

    sendEvent('done', {
      messageId: assistantMsg.id,
      content: finalResponseText,
      citations,
      tokenUsage,
      contextStats,
    });
    res.end();
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'An error occurred while processing your request.';
    console.error('[streamChatHandler] Unhandled stream execution error:', error);
    try {
      const fallbackText = `I encountered a temporary issue while processing your request (${errMessage}). Please try again.`;
      sendEvent('chunk', { content: fallbackText });
      const assistantMsg = await addMessage(
        id,
        workspaceId,
        req.user.id,
        'assistant',
        fallbackText
      );
      sendEvent('done', {
        messageId: assistantMsg.id,
        content: fallbackText,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });
    } catch {
      res.write(`event: error\ndata: ${JSON.stringify({ message: errMessage })}\n\n`);
    }
    res.end();
  }
};

export const getAnalyticsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
  const analytics = await getAnalytics(workspaceId, req.user.id);
  res.json({ success: true, data: analytics });
});
