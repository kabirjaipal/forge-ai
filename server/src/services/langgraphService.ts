import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { createChatGroqModel, extractTextContent } from './groqService.js';
import { mcpServer } from './mcpService.js';
import prisma from '../lib/prisma.js';

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
      }),
    }
  );
  toolsList.push(webSearchTool);

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
      }),
    }
  );
  toolsList.push(weatherApiTool);

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
        schema: z.object(propertySchema).passthrough(),
      }
    );
    toolsList.push(dynamicTool);
  }

  return toolsList;
}



// Persistent in-memory checkpointer for thread-scoped conversation state tracking
const agentCheckpointer = new MemorySaver();

/**
 * Pure LangGraph Autonomous Agent Execution Engine.
 * Built using @langchain/langgraph prebuilt createReactAgent and streamEvents.
 * Manages tool invocation, state graphs, and streaming response events natively.
 */
export async function runPureLangChainToolAgentStream(input: LangChainAgentStreamInput): Promise<string> {
  const { workspaceId, agentId, systemPrompt, model, temperature, messages, toolIds, onChunk, onToolStart, onToolDone } = input;

  // 1. Build LangChain tools
  const tools = await getLangChainTools(workspaceId, toolIds);

  // 2. Create ChatGroq model
  const chatModel = createChatGroqModel(model, temperature ?? 0.7);

  // 3. Construct LangChain BaseMessage history
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const langchainMessages: BaseMessage[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i]!;
    if (m.role === 'user') langchainMessages.push(new HumanMessage(m.content));
    else if (m.role === 'assistant') langchainMessages.push(new AIMessage(m.content));
  }

  langchainMessages.push(new HumanMessage(lastUserMsg));

  // 4. Create LangGraph ReAct Agent Graph with Checkpointer
  const agentGraph = createReactAgent({
    llm: chatModel,
    tools,
    checkpointSaver: agentCheckpointer,
    ...(systemPrompt ? { stateModifier: systemPrompt } : {}),
  });

  const threadId = agentId || workspaceId;
  const TOOL_ACTION_MESSAGES: Record<string, string> = {
    web_search: 'Searching the web...',
    weather_api: 'Fetching live weather data...',
  };

  let fullOutput = '';

  // 5. Execute LangGraph compiled graph using streamEvents (v2)
  try {
    const eventStream = await agentGraph.streamEvents(
      { messages: langchainMessages },
      {
        version: 'v2',
        configurable: { thread_id: threadId },
      }
    );

    for await (const event of eventStream) {
      if (event.event === 'on_chat_model_stream') {
        const textChunk = extractTextContent(event.data?.chunk?.content);
        if (textChunk) {
          fullOutput += textChunk;
          await onChunk(textChunk);
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
  } catch (err) {
    console.warn('[runPureLangChainToolAgentStream] LangGraph stream execution fallback:', err);
    if (!fullOutput) {
      // Fallback simple invocation if streamEvents encounters unexpected provider stream formats
      const result = await agentGraph.invoke(
        { messages: langchainMessages },
        { configurable: { thread_id: threadId } }
      );
      const lastMsg = result.messages[result.messages.length - 1];
      fullOutput = extractTextContent(lastMsg?.content);
      if (fullOutput) {
        await onChunk(fullOutput);
      }
    }
  }

  return fullOutput;
}

