import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createChatGroqModel, extractTextContent } from './groqService.js';
import { mcpServer } from './mcpService.js';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

export interface LangChainAgentStreamInput {
  workspaceId: string;
  agentId?: string | undefined;
  systemPrompt?: string | undefined;
  model?: string | undefined;
  temperature?: number | undefined;
  messages: Array<{ role: string; content: string }>;
  toolIds?: string[] | undefined;
  onChunk: (chunkText: string) => Promise<void> | void;
  onToolStart?: (toolName: string, message: string) => void;
  onToolDone?: (toolName: string, message: string, success: boolean) => void;
}

/**
 * Dynamically builds LangChain tools from MCP & Workspace registered tools.
 */
export async function getLangChainTools(workspaceId: string, toolIds?: string[]): Promise<StructuredToolInterface[]> {
  const toolsList: StructuredToolInterface[] = [];

  // 1. web_search tool
  const webSearchTool = tool(
    async ({ query }) => {
      const result = await mcpServer.executeMcpToolHandler('web_search', { query }, workspaceId);
      return result.content[0]?.text || 'No results';
    },
    {
      name: 'web_search',
      description: 'Search the live web for real-time information, news, current affairs, events, weather, and queries.',
      schema: z.object({
        query: z.string().describe('Search query to look up on the web'),
      }) as any,
    }
  );
  toolsList.push(webSearchTool as unknown as StructuredToolInterface);

  // 2. weather_api tool
  const weatherApiTool = tool(
    async ({ location }) => {
      const result = await mcpServer.executeMcpToolHandler('weather_api', { location }, workspaceId);
      return result.content[0]?.text || 'No weather data';
    },
    {
      name: 'weather_api',
      description: 'Fetch real-time live weather conditions and temperature for any city in the world.',
      schema: z.object({
        location: z.string().describe('City name or location (e.g. London, Tokyo, San Francisco, Jodhpur)'),
      }) as any,
    }
  );
  toolsList.push(weatherApiTool as unknown as StructuredToolInterface);

  // 3. Custom DB registered tools
  const customWhere = toolIds && toolIds.length > 0
    ? { id: { in: toolIds } }
    : { workspaceId };

  const dbTools = await prisma.tool.findMany({ where: customWhere });

  for (const customTool of dbTools) {
    if (toolsList.some((t) => t.name === customTool.name)) continue;

    const propertySchema: Record<string, z.ZodTypeAny> = {
      q: z.string().optional().describe('Search query parameter string (e.g. user:username, language:ts, topic:ai)'),
      query: z.string().optional().describe('Search query string'),
    };

    if (customTool.schema && typeof customTool.schema === 'object' && (customTool.schema as any).properties) {
      const props = (customTool.schema as any).properties;
      for (const [propName, propDef] of Object.entries(props)) {
        const desc = (propDef as any)?.description || `Parameter ${propName}`;
        propertySchema[propName] = z.string().optional().describe(desc);
      }
    }

    const dynamicTool = tool(
      async (args) => {
        const result = await mcpServer.executeMcpToolHandler(customTool.name, args as any, workspaceId);
        return result.content[0]?.text || 'Tool execution finished';
      },
      {
        name: customTool.name,
        description: customTool.description || `Tool ${customTool.name}`,
        schema: z.object(propertySchema).passthrough() as any,
      }
    );
    toolsList.push(dynamicTool as unknown as StructuredToolInterface);
  }

  return toolsList;
}

/**
 * Pure LangGraph Autonomous Agent Execution Engine.
 * Built using @langchain/langgraph prebuilt createReactAgent and streamEvents.
 * Manages tool invocation, state graphs, and streaming response events natively.
 */
export interface LangChainAgentStreamOutput {
  text: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Pure LangGraph Autonomous Agent Execution Engine.
 * Built using @langchain/langgraph prebuilt createReactAgent and streamEvents.
 * Manages tool invocation, state graphs, and streaming response events natively.
 * Features automatic fallback to llama-3.1-8b-instant on Groq TPM rate limits.
 */
export async function runPureLangChainToolAgentStream(input: LangChainAgentStreamInput): Promise<LangChainAgentStreamOutput> {
  const { workspaceId, agentId, systemPrompt, model, temperature, messages, toolIds, onChunk, onToolStart, onToolDone } = input;

  // 1. Build LangChain tools
  const tools = await getLangChainTools(workspaceId, toolIds);

  // 2. Construct LangChain BaseMessage history
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const langchainMessages: BaseMessage[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i]!;
    if (m.role === 'user') langchainMessages.push(new HumanMessage(m.content));
    else if (m.role === 'assistant') langchainMessages.push(new AIMessage(m.content));
  }

  langchainMessages.push(new HumanMessage(lastUserMsg));

  const targetModel = model || 'llama-3.3-70b-versatile';
  const totalChars = langchainMessages.reduce((sum, m) => sum + extractTextContent(m.content).length, 0) + (systemPrompt?.length || 0);

  logger.debug({ model: targetModel, messageCount: langchainMessages.length, approxPromptTokens: Math.round(totalChars / 4) }, '[LangGraph] Initiating agent stream request');

  const executeGraph = async (selectedModel: string): Promise<LangChainAgentStreamOutput> => {
    const chatModel = createChatGroqModel(selectedModel, temperature ?? 0.7);

    const agentGraph = createReactAgent({
      llm: chatModel,
      tools,
      ...(systemPrompt ? { stateModifier: systemPrompt } : {}),
    });

    const TOOL_ACTION_MESSAGES: Record<string, string> = {
      web_search: 'Searching the web...',
      weather_api: 'Fetching live weather data...',
    };

    let fullOutput = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const eventStream = await agentGraph.streamEvents(
        { messages: langchainMessages },
        { version: 'v2' }
      );

      for await (const event of eventStream) {
        if (event.event === 'on_chat_model_stream') {
          const textChunk = extractTextContent(event.data?.chunk?.content);
          if (textChunk) {
            fullOutput += textChunk;
            await onChunk(textChunk);
          }
        } else if (event.event === 'on_chat_model_end') {
          const usage = event.data?.output?.usage_metadata || event.data?.output?.response_metadata?.tokenUsage;
          if (usage) {
            if (usage.input_tokens || usage.promptTokens) promptTokens += (usage.input_tokens || usage.promptTokens || 0);
            if (usage.output_tokens || usage.completionTokens) completionTokens += (usage.output_tokens || usage.completionTokens || 0);
          }
        } else if (event.event === 'on_tool_start') {
          const toolName = event.name || 'tool';
          const actionMsg = TOOL_ACTION_MESSAGES[toolName] || `Executing ${toolName}...`;
          onToolStart?.(toolName, actionMsg);
        } else if (event.event === 'on_tool_end') {
          const toolName = event.name || 'tool';
          const isError = Boolean(event.data?.output?.isError);
          onToolDone?.(toolName, `Executed ${toolName}`, !isError);
        }
      }
    } catch (err: any) {
      logger.warn({ model: selectedModel, err }, '[runPureLangChainToolAgentStream] Stream execution error');
      if (!fullOutput) {
        // Check if Groq included conversational text inside failed_generation (e.g. before pseudo <function> tag)
        const failedGen = err?.error?.failed_generation || err?.error?.error?.failed_generation;
        if (typeof failedGen === 'string' && failedGen.trim()) {
          const cleanedText = failedGen.replace(/<function[\s\S]*?<\/function>/gi, '').trim();
          if (cleanedText) {
            fullOutput = cleanedText;
            await onChunk(cleanedText);
          }
        }

        if (!fullOutput) {
          const result = await agentGraph.invoke({ messages: langchainMessages });
          const lastMsg = result.messages[result.messages.length - 1];
          fullOutput = extractTextContent(lastMsg?.content);
          if (fullOutput) {
            await onChunk(fullOutput);
          }
        }
      }
    }

    if (!fullOutput) {
      throw new Error(`Model ${selectedModel} failed to return output.`);
    }

    if (promptTokens === 0) promptTokens = Math.max(10, Math.round(totalChars / 4));
    if (completionTokens === 0) completionTokens = Math.max(5, Math.round(fullOutput.length / 4));

    const tokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };

    logger.debug({ model: selectedModel, ...tokenUsage }, '[LangGraph] Agent stream execution completed');

    return {
      text: fullOutput,
      tokenUsage,
    };
  };

  try {
    return await executeGraph(targetModel);
  } catch (err: any) {
    const errStr = String(err?.message || err);
    const status = err?.status || err?.statusCode;
    const isRateLimitOrQuotaExhausted =
      status === 429 ||
      status === 413 ||
      errStr.includes('429') ||
      errStr.includes('413') ||
      errStr.includes('rate_limit_exceeded') ||
      errStr.includes('tokens per day') ||
      errStr.includes('tokens per minute') ||
      errStr.includes('TPD') ||
      errStr.includes('TPM') ||
      errStr.includes('tool_use_failed');

    if (isRateLimitOrQuotaExhausted && targetModel !== 'llama-3.1-8b-instant') {
      logger.warn({ targetModel }, '[LangGraph] Rate/Quota limit or tool formatting error hit. Retrying automatically with llama-3.1-8b-instant');
      return await executeGraph('llama-3.1-8b-instant');
    }

    throw err;
  }
}

