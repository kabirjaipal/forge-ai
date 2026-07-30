import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
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

    let propertySchema: Record<string, z.ZodTypeAny> = {
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

/**
 * Pure LangChain Autonomous Agent Execution Engine.
 * Enables the AI model to autonomously inspect prompt intent, select the appropriate tools,
 * and dynamically generate parameters (tc.args) matching each tool's Zod/JSON schema.
 */
export async function runPureLangChainToolAgentStream(input: LangChainAgentStreamInput): Promise<string> {
  const { workspaceId, systemPrompt, model, temperature, messages, toolIds, onChunk, onToolStart, onToolDone } = input;

  // 1. Build LangChain tools & tool map
  const tools = await getLangChainTools(workspaceId, toolIds);
  const toolsMap = Object.fromEntries(tools.map((t) => [t.name, t]));

  // 2. Create ChatGroq model
  const chatModel = createChatGroqModel(model, temperature ?? 0.7);

  // 3. Construct LangChain BaseMessage history
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const langchainMessages: BaseMessage[] = [];

  if (systemPrompt) {
    langchainMessages.push(new SystemMessage(systemPrompt));
  }

  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i]!;
    if (m.role === 'user') langchainMessages.push(new HumanMessage(m.content));
    else if (m.role === 'assistant') langchainMessages.push(new AIMessage(m.content));
  }

  langchainMessages.push(new HumanMessage(lastUserMsg));

  // 4. Autonomous AI Tool Calling & Argument Generation
  // The AI Agent inspects the user prompt and tool schemas, autonomously selecting tools & generating args (tc.args)
  const toolCallingModel = createChatGroqModel(model, 0.1).bindTools(tools);

  let aiMsg: AIMessage | null = null;
  try {
    aiMsg = await toolCallingModel.invoke(langchainMessages);
  } catch (err) {
    console.warn('[runPureLangChainToolAgentStream] Tool binding invoke failed:', err);
  }

  if (aiMsg && aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
    langchainMessages.push(aiMsg);

    const TOOL_ACTION_MESSAGES: Record<string, string> = {
      web_search: 'Searching the web...',
      weather_api: 'Fetching live weather data...',
    };

    for (const tc of aiMsg.tool_calls) {
      const toolName = tc.name;
      const targetTool = toolsMap[toolName];
      if (!targetTool) continue;

      const actionMsg = TOOL_ACTION_MESSAGES[toolName] || `Executing ${toolName}...`;
      onToolStart?.(toolName, actionMsg);

      let toolResultText = '';
      let success = true;

      try {
        // Pass the AI's autonomously generated arguments (tc.args) directly to the tool!
        const rawRes = await targetTool.invoke(tc.args);
        toolResultText = typeof rawRes === 'string' ? rawRes : JSON.stringify(rawRes);
      } catch (err: any) {
        success = false;
        toolResultText = `Error executing tool: ${err?.message || 'Tool execution failed'}`;
      }

      onToolDone?.(toolName, `Executed ${toolName}`, success);

      // Append pure LangChain ToolMessage
      langchainMessages.push(
        new ToolMessage({
          content: toolResultText,
          tool_call_id: tc.id || toolName,
        })
      );
    }
  }

  // 5. Stream final response using LangChain ChatGroq model stream
  let fullOutput = '';
  const stream = await chatModel.stream(langchainMessages);
  for await (const chunk of stream) {
    const textChunk = extractTextContent(chunk.content);
    if (textChunk) {
      fullOutput += textChunk;
      await onChunk(textChunk);
    }
  }

  return fullOutput;
}
