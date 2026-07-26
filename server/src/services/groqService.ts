export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamGroqInput {
  systemPrompt?: string | undefined;
  ragContext?: string | undefined;
  messages: ChatMessageInput[];
  model?: string | undefined;
  temperature?: number | undefined;
  onChunk: (chunkText: string) => Promise<void> | void;
}

/**
 * Streams completion tokens from Groq API via SSE readable stream.
 * Default model: llama-3.3-70b-versatile
 * Throws explicit errors on API or config failure — NO custom fallback assistant messages.
 */
export async function streamGroqCompletion(input: StreamGroqInput): Promise<string> {
  const { systemPrompt, ragContext, messages, model, temperature, onChunk } = input;

  const apiKey = process.env['GROQ_API_KEY'];
  const isRealApiKey = apiKey && apiKey.startsWith('gsk_') && !apiKey.includes('your_groq_api_key_here');

  if (!isRealApiKey) {
    throw new Error('Groq API key is missing or invalid in server/.env. Please configure a valid GROQ_API_KEY.');
  }

  // 1. Construct system prompt & RAG context
  let finalSystemPrompt = systemPrompt?.trim() || 'You are an intelligent, helpful AI assistant built on ForgeAI.';
  if (ragContext && ragContext.trim().length > 0) {
    finalSystemPrompt += `\n\n--- RETRIEVED KNOWLEDGE BASE CONTEXT ---\n${ragContext.trim()}\n--- END CONTEXT ---`;
  }

  const formattedMessages: ChatMessageInput[] = [
    { role: 'system', content: finalSystemPrompt },
    ...messages,
  ];

  const targetModel = model || 'llama-3.3-70b-versatile';
  const targetTemp = typeof temperature === 'number' ? temperature : 0.7;

  const baseUrl = (process.env['GROQ_BASE_URL'] || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');

  // 2. Call Groq OpenAI-compatible Chat Completions endpoint with stream: true
  const response = await globalThis.fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages: formattedMessages,
      temperature: targetTemp,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errorBody}`);
  }

  if (!response.body) {
    throw new Error('Groq API response body is empty');
  }

  // 3. Read SSE stream
  let accumulatedText = '';
  const reader = response.body.getReader();
  const decoder = new globalThis.TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') break;

      if (trimmed.startsWith('data: ')) {
        try {
          const jsonStr = trimmed.slice(6);
          const parsed = JSON.parse(jsonStr) as {
            choices: Array<{ delta?: { content?: string } }>;
          };
          const deltaContent = parsed.choices[0]?.delta?.content;
          if (deltaContent) {
            accumulatedText += deltaContent;
            await onChunk(deltaContent);
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }

  if (!accumulatedText.trim()) {
    throw new Error('AI returned an empty response.');
  }

  return accumulatedText;
}
