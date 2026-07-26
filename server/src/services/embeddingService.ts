import { pipeline } from '@huggingface/transformers';

export interface TextChunk {
  index: number;
  text: string;
}

// Lazy-loaded HuggingFace pipeline singleton for zero memory overhead on startup
let extractorInstance: any = null;

async function getExtractor() {
  if (!extractorInstance) {
    console.log('[EmbeddingService] Loading local HuggingFace embedding model (Xenova/all-MiniLM-L6-v2)...');
    extractorInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[EmbeddingService] Local embedding model ready!');
  }
  return extractorInstance;
}

/**
 * Splits text into chunks of specified maximum size with configurable overlap,
 * preserving paragraph and sentence boundaries where possible.
 */
export function chunkText(text: string, chunkSize = 500, chunkOverlap = 50): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const cleanedText = text.replace(/\r\n/g, '\n').trim();
  if (cleanedText.length <= chunkSize) {
    return [{ index: 0, text: cleanedText }];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanedText.length) {
      const paragraphBoundary = cleanedText.lastIndexOf('\n\n', endIndex);
      const lineBoundary = cleanedText.lastIndexOf('\n', endIndex);
      const sentenceBoundary = cleanedText.lastIndexOf('. ', endIndex);
      const spaceBoundary = cleanedText.lastIndexOf(' ', endIndex);

      if (paragraphBoundary > startIndex + chunkSize / 2) {
        endIndex = paragraphBoundary + 2;
      } else if (lineBoundary > startIndex + chunkSize / 2) {
        endIndex = lineBoundary + 1;
      } else if (sentenceBoundary > startIndex + chunkSize / 2) {
        endIndex = sentenceBoundary + 2;
      } else if (spaceBoundary > startIndex + chunkSize / 2) {
        endIndex = spaceBoundary + 1;
      }
    } else {
      endIndex = cleanedText.length;
    }

    const chunkContent = cleanedText.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: chunkContent,
      });
    }

    if (endIndex >= cleanedText.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - chunkOverlap);
  }

  return chunks;
}

/**
 * Generates vector embeddings 100% locally in Node.js using @huggingface/transformers.
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions, normalized).
 * Zero API keys, zero payments, zero external servers.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];

  try {
    const extractor = await getExtractor();
    const embeddings: number[][] = [];

    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const vectorArray = Array.from(output.data as Float32Array | number[]);
      embeddings.push(vectorArray);
    }

    return embeddings;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EmbeddingService] Local Hugging Face Transformers embedding failed:', errorMsg);
    throw new Error(`Local Embedding Error: ${errorMsg}`);
  }
}

/**
 * Calculates Cosine Similarity between two vector arrays.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
