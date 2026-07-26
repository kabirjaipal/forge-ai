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
import prisma from '../lib/prisma.js';

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

    // Set up SSE headers for real-time streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    sendEvent('start', { conversationId: id, ragMatchesCount: ragMatches.length });

    // Clean query by removing @tool_name tags
    const cleanedQuery = content.replace(/@\w+/g, '').trim() || content;

    // 3b. Execute attached Agent Tools or explicit @tool_name user mentions in chat
    let toolContextString = '';
    const executedToolResults: string[] = [];
    const lowerContent = content.toLowerCase();

    // Execute tools when explicitly mentioned via @tool_name or assigned to the agent
    const mcpToolsToRun = new Set<string>();

    const workspaceTools = await prisma.tool.findMany({
      where: {
        OR: [
          { isCustom: false },
          { workspaceId },
        ],
      },
    });

    for (const tool of workspaceTools) {
      if (lowerContent.includes(`@${tool.name.toLowerCase()}`)) {
        mcpToolsToRun.add(tool.name);
      }
    }

    const TOOL_ACTION_MESSAGES: Record<string, string> = {
      web_search: `Searching the web for "${cleanedQuery}"...`,
      weather_api: `Fetching live weather data for "${cleanedQuery}"...`,
    };

    const TOOL_DONE_MESSAGES: Record<string, string> = {
      web_search: `Searched online web sources`,
      weather_api: `Retrieved live weather forecast`,
    };

    for (const toolName of mcpToolsToRun) {
      const actionMsg = TOOL_ACTION_MESSAGES[toolName] || `Executing ${toolName}...`;
      sendEvent('tool_start', { toolName, message: actionMsg });

      const result = await executeTool(
        toolName,
        { query: cleanedQuery, location: cleanedQuery, endpoint: cleanedQuery },
        workspaceId
      );

      const doneMsg = TOOL_DONE_MESSAGES[toolName] || `Executed ${toolName}`;
      sendEvent('tool_done', { toolName, message: doneMsg, success: result.success });

      if (result.success && result.result) {
        executedToolResults.push(`[MCP TOOL EXECUTION OUTPUT - ${toolName.toUpperCase()}]\nResult Data:\n${JSON.stringify(result.result, null, 2)}`);
      }
    }

    if (executedToolResults.length > 0) {
      toolContextString = `\n\n--- MCP TOOL EXECUTION RESULTS ---\n${executedToolResults.join('\n\n')}\n--- INSTRUCTION FOR ASSISTANT ---\nIncorporate the tool execution results provided above into your response accurately based on the data returned by the executed tools.`;
    }

    // 4. Sliding Context Window (Fast & Efficient like ChatGPT: last 14 messages max)
    const SLIDING_WINDOW_SIZE = 14;
    const historyMessages = conversation.messages.slice(-SLIDING_WINDOW_SIZE);
    const previousMessages = historyMessages.map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));
    previousMessages.push({ role: 'user', content: cleanedQuery });

    const baseSystemPrompt = conversation.agent?.systemPrompt || 'You are an intelligent AI Assistant.';
    const finalSystemPrompt = `${baseSystemPrompt}${toolContextString}`;

    sendEvent('start', {
      conversationId: id,
      ragMatchesCount: ragMatches.length,
    });

    // 5. Stream completion from Groq API (returns exact API usage metrics)
    const streamOutput = await streamGroqCompletion({
      systemPrompt: finalSystemPrompt,
      ragContext: ragContextString,
      messages: previousMessages,
      model: conversation.agent?.model || 'llama-3.3-70b-versatile',
      temperature: conversation.agent?.temperature ?? 0.7,
      onChunk: (chunkText) => {
        sendEvent('chunk', { content: chunkText });
      },
    });

    const finalResponseText = streamOutput.text.trim();
    const tokenUsage = streamOutput.usage;

    const MAX_CONTEXT_TOKENS = 128000;
    const contextStats = {
      usedTokens: tokenUsage.totalTokens,
      maxTokens: MAX_CONTEXT_TOKENS,
      remainingTokens: MAX_CONTEXT_TOKENS - tokenUsage.totalTokens,
      percentage: Number(((tokenUsage.totalTokens / MAX_CONTEXT_TOKENS) * 100).toFixed(2)),
    };

    // 6. Store final assistant message with citations & token usage metadata
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
