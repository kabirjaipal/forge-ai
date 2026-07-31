import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamGroqInput {
  systemPrompt?: string | undefined;
  messages: ChatMessageInput[];
  model?: string | undefined;
  temperature?: number | undefined;
  onChunk: (chunkText: string) => Promise<void> | void;
}

export interface GroqUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamGroqOutput {
  text: string;
  usage: GroqUsage;
}

export function extractTextContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, any>;
          return obj['text'] || obj['content'] || '';
        }
        return '';
      })
      .join('');
  }
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, any>;
    return obj['text'] || obj['content'] || '';
  }
  return '';
}

/**
 * Creates an instance of ChatGroq using @langchain/groq.
 */
export function createChatGroqModel(modelName?: string, temperature?: number): ChatGroq {
  const apiKey = process.env['GROQ_API_KEY'];
  const isRealApiKey = apiKey && apiKey.startsWith('gsk_') && !apiKey.includes('your_groq_api_key_here');

  if (!isRealApiKey) {
    throw new Error('Groq API key is missing or invalid in server/.env. Please configure a valid GROQ_API_KEY.');
  }

  let baseUrl = process.env['GROQ_BASE_URL'];
  if (baseUrl) {
    baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/openai\/v1$/i, '');
    if (baseUrl === 'https://api.groq.com') {
      baseUrl = undefined;
    }
  }

  if (!modelName) {
    throw new Error('No AI model specified. Please select a valid model.');
  }

  return new ChatGroq({
    apiKey,
    model: modelName,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    ...(baseUrl ? { baseUrl } : {}),
  });
}

/**
 * Streams completion tokens using LangChain's ChatGroq and supports LangSmith tracing automatically.
 * Default model: llama-3.3-70b-versatile
 */
export async function streamGroqCompletion(input: StreamGroqInput): Promise<StreamGroqOutput> {
  const { systemPrompt, messages, model, temperature, onChunk } = input;

  const chatModel = createChatGroqModel(model, temperature);

  // RAG context is pre-embedded into systemPrompt by the caller before invoking this function.
  const finalSystemPrompt = systemPrompt?.trim() || 'You are an intelligent, helpful AI assistant built on ForgeAI.';

  const langchainMessages: BaseMessage[] = [
    new SystemMessage(finalSystemPrompt),
    ...messages.map((m) => {
      if (m.role === 'user') return new HumanMessage(m.content);
      if (m.role === 'assistant') return new AIMessage(m.content);
      return new SystemMessage(m.content);
    }),
  ];

  let accumulatedText = '';
  let usage: GroqUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // 2. Stream using LangChain ChatGroq stream API
  const stream = await chatModel.stream(langchainMessages);

  for await (const chunk of stream) {
    const textChunk = extractTextContent(chunk.content);
    if (textChunk) {
      accumulatedText += textChunk;
      await onChunk(textChunk);
    }
    const meta = chunk.response_metadata as Record<string, any> | undefined;
    if (meta && meta['tokenUsage']) {
      const tu = meta['tokenUsage'];
      usage = {
        promptTokens: tu.promptTokens || tu.prompt_tokens || 0,
        completionTokens: tu.completionTokens || tu.completion_tokens || 0,
        totalTokens: tu.totalTokens || tu.total_tokens || 0,
      };
    }
  }

  if (!accumulatedText.trim()) {
    throw new Error('AI returned an empty response.');
  }

  return {
    text: accumulatedText,
    usage,
  };
}

export async function fetchAvailableModels(): Promise<Array<{ id: string; name: string; contextWindow: number; isActive: boolean }>> {
  const apiKey = process.env['GROQ_API_KEY'];
  let baseUrl = process.env['GROQ_BASE_URL'] || 'https://api.groq.com';
  baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/openai\/v1$/i, '');

  const isRealApiKey = apiKey && apiKey.startsWith('gsk_') && !apiKey.includes('your_groq_api_key_here');

  if (!isRealApiKey) {
    throw new Error('Groq API key is missing or invalid in server/.env. Please configure a valid GROQ_API_KEY.');
  }

  const res = await globalThis.fetch(`${baseUrl}/openai/v1/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch live models from provider API (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { data?: Array<{ id: string; context_window?: number; active?: boolean }> };
  if (!data?.data || data.data.length === 0) {
    return [];
  }

  return data.data
    .filter((m) => !m.id.includes('whisper') && !m.id.includes('safetensors'))
    .map((m) => ({
      id: m.id,
      name: m.id.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      contextWindow: m.context_window || 128000,
      isActive: m.active !== false,
    }));
}

const SearchQueriesSchema = z.object({
  queries: z.array(z.string()).describe('3 distinct, targeted search queries for web lookup'),
});

/**
 * Uses LLM to intelligently generate 2-3 search query variations for Multi-Query Web Expansion.
 * Uses LangChain's native .withStructuredOutput for schema-guaranteed output.
 */
export async function generateExpandedSearchQueries(userQuery: string): Promise<string[]> {
  const clean = userQuery
    .replace(/^@\w+\s*/, '')
    .replace(/@\w+/g, '')
    .replace(/^(?:search online for|search web for|search for|google|find)\s*/i, '')
    .trim();
  if (!clean) return [userQuery];

  try {
    const chatModel = createChatGroqModel('llama-3.1-8b-instant', 0.2);
    const structuredModel = chatModel.withStructuredOutput(SearchQueriesSchema);

    const systemInstruction = new SystemMessage(
      `You are an AI Search Query Optimizer. Generate 3 distinct, targeted search queries for web search engines to find comprehensive results for the user's intent.`
    );
    const userMsg = new HumanMessage(clean);

    const result = await structuredModel.invoke([systemInstruction, userMsg]);
    if (result && Array.isArray(result.queries) && result.queries.length > 0) {
      const expanded = result.queries.map((q) => String(q).trim()).filter(Boolean);
      if (!expanded.includes(clean)) {
        expanded.unshift(clean);
      }
      return expanded;
    }
  } catch (err) {
    console.error('[QueryExpansion] Structured query expansion error:', err);
  }

  return [clean];
}


