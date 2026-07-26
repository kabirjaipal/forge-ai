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
import { searchRelevantChunks } from '../services/ragService.js';
import { streamGroqCompletion } from '../services/groqService.js';
import { executeTool } from '../services/toolService.js';

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
    // 1. Fetch conversation details to check attached agent and message history
    const conversation = await getConversationById(id, workspaceId, req.user.id);
    const agentId = conversation.agentId || undefined;

    // 2. Store user message in database
    await addMessage(id, workspaceId, req.user.id, 'user', content);

    // 3. Perform RAG Vector Similarity Search across workspace/agent document chunks
    const ragMatches = await searchRelevantChunks(workspaceId, content, agentId, 4);

    let ragContextString = '';
    const citations = ragMatches.map((match) => ({
      documentId: match.documentId,
      documentName: match.documentName,
      snippet: match.content,
      relevanceScore: Math.round(match.score * 100) / 100,
    }));

    if (ragMatches.length > 0) {
      ragContextString = ragMatches
        .map((m, idx) => `[Source ${idx + 1}: ${m.documentName}]\n${m.content}`)
        .join('\n\n');
    }

    // 3b. Execute attached Agent Tools if present
    let toolContextString = '';
    const agentTools = conversation.agent?.agentTools || [];
    if (agentTools.length > 0) {
      const executedToolResults: string[] = [];
      const lowerContent = content.toLowerCase();
      for (const at of agentTools) {
        const toolName = at.tool.name;
        if (
          (toolName === 'weather_api' && (lowerContent.includes('weather') || lowerContent.includes('temp') || lowerContent.includes('forecast'))) ||
          (toolName === 'web_search' && (lowerContent.includes('search') || lowerContent.includes('web') || lowerContent.includes('latest'))) ||
          (toolName === 'db_query' && (lowerContent.includes('database') || lowerContent.includes('query') || lowerContent.includes('stats') || lowerContent.includes('count'))) ||
          toolName === 'search_docs' || toolName === 'search_documents'
        ) {
          const result = await executeTool(toolName, { query: content, location: content }, workspaceId);
          if (result.success && result.result) {
            executedToolResults.push(`[Tool Execution: ${toolName}]\nResult: ${JSON.stringify(result.result, null, 2)}`);
          }
        }
      }
      if (executedToolResults.length > 0) {
        toolContextString = `\n\n--- ACTIVE TOOL EXECUTION OUTPUTS ---\n${executedToolResults.join('\n\n')}\n--- END TOOL OUTPUTS ---`;
      }
    }

    // Prepare previous conversation history for multi-turn LLM context
    const previousMessages = conversation.messages.map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));
    previousMessages.push({ role: 'user', content });

    // Set up SSE headers for streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('start', { conversationId: id, ragMatchesCount: ragMatches.length });

    // 4. Stream completion from Groq API
    const finalSystemPrompt = (conversation.agent?.systemPrompt || 'You are an AI Assistant.') + toolContextString;
    const finalResponseText = await streamGroqCompletion({
      systemPrompt: finalSystemPrompt,
      ragContext: ragContextString,
      messages: previousMessages,
      model: conversation.agent?.model || 'llama-3.3-70b-versatile',
      temperature: conversation.agent?.temperature ?? 0.7,
      onChunk: (chunkText) => {
        sendEvent('chunk', { content: chunkText });
      },
    });

    // 5. Store final assistant message with citations
    const assistantMsg = await addMessage(
      id,
      workspaceId,
      req.user.id,
      'assistant',
      finalResponseText.trim(),
      citations.length > 0 ? citations : undefined,
    );

    sendEvent('done', {
      messageId: assistantMsg.id,
      content: finalResponseText.trim(),
      citations,
    });
    res.end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    res.end();
  }
};

export const getAnalyticsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = req.params['workspaceId']!;
  const analytics = await getAnalytics(workspaceId, req.user.id);
  res.json({ success: true, data: analytics });
});
