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

    // Set up SSE headers for real-time streaming response
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

    // Clean query by removing @tool_name tags
    const cleanedQuery = content.replace(/@\w+/g, '').trim() || content;

    // 3b. Execute attached Agent Tools or explicit @tool_name user mentions in chat
    let toolContextString = '';
    const agentTools = conversation.agent?.agentTools || [];
    const executedToolResults: string[] = [];
    const lowerContent = content.toLowerCase();

    // Natural language & @mention intent detection for MCP Tools
    const mcpToolsToRun = new Set<string>();

    // 1. Web Search Tool Detection
    if (
      lowerContent.includes('@web_search') ||
      lowerContent.includes('@search_web') ||
      lowerContent.includes('@google') ||
      lowerContent.includes('search online') ||
      lowerContent.includes('search web') ||
      lowerContent.includes('online search') ||
      lowerContent.includes('web search') ||
      lowerContent.includes('latest news') ||
      lowerContent.includes('current event')
    ) {
      mcpToolsToRun.add('web_search');
    }

    // 2. Document RAG Search Tool Detection
    if (
      lowerContent.includes('@search_docs') ||
      lowerContent.includes('@search_documents') ||
      lowerContent.includes('@docs') ||
      lowerContent.includes('search docs') ||
      lowerContent.includes('search documents') ||
      lowerContent.includes('knowledge base') ||
      lowerContent.includes('in docs') ||
      lowerContent.includes('my files')
    ) {
      mcpToolsToRun.add('search_documents');
    }

    // 3. Weather API Tool Detection
    if (
      lowerContent.includes('@weather') ||
      lowerContent.includes('@weather_api') ||
      lowerContent.includes('weather in') ||
      lowerContent.includes('forecast in') ||
      lowerContent.includes('temperature in')
    ) {
      mcpToolsToRun.add('weather_api');
    }

    // 4. GitHub API Tool Detection
    if (
      lowerContent.includes('@github') ||
      lowerContent.includes('@github_api') ||
      lowerContent.includes('github repo') ||
      lowerContent.includes('github api') ||
      lowerContent.includes('repo stats')
    ) {
      mcpToolsToRun.add('github_api');
    }

    // 5. Database Metrics Tool Detection
    if (
      lowerContent.includes('@db_query') ||
      lowerContent.includes('@db') ||
      lowerContent.includes('@stats') ||
      lowerContent.includes('database stats') ||
      lowerContent.includes('workspace metrics') ||
      lowerContent.includes('how many documents')
    ) {
      mcpToolsToRun.add('db_query');
    }

    // Also include any tools attached to the Agent
    for (const at of agentTools) {
      mcpToolsToRun.add(at.tool.name);
    }


    const TOOL_ACTION_MESSAGES: Record<string, string> = {
      web_search: `Searching the web for "${cleanedQuery}"...`,
      weather_api: `Fetching live weather data for "${cleanedQuery}"...`,
      github_api: `Querying GitHub API for "${cleanedQuery}"...`,
      db_query: `Retrieving database metrics & workspace analytics...`,
      search_documents: `Searching document vector database for "${cleanedQuery}"...`,
    };

    const TOOL_DONE_MESSAGES: Record<string, string> = {
      web_search: `Searched online web sources`,
      weather_api: `Retrieved live weather forecast`,
      github_api: `Fetched GitHub repository data`,
      db_query: `Retrieved workspace database stats`,
      search_documents: `Retrieved knowledge base chunks`,
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
      toolContextString = `\n\n--- CRITICAL: LIVE REAL-TIME TOOL EXECUTION DATA ---\n${executedToolResults.join('\n\n')}\n--- MANDATORY INSTRUCTION FOR ASSISTANT ---\nYou MUST base your answer directly on the LIVE REAL-TIME TOOL EXECUTION DATA provided above. Do NOT say you do not have real-time information or mention your training knowledge cutoff. Treat the live tool data above as authoritative real-time facts.`;
    }

    // Prepare previous conversation history for multi-turn LLM context
    const previousMessages = conversation.messages.map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }));
    previousMessages.push({ role: 'user', content: cleanedQuery });

    // 4. Stream completion from Groq API
    const baseSystemPrompt = conversation.agent?.systemPrompt || 'You are an intelligent AI Assistant.';
    const finalSystemPrompt = `${baseSystemPrompt}${toolContextString}`;

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
