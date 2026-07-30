import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';

export interface TextChunk {
  index: number;
  text: string;
}

/**
 * Creates a LangChain-native HuggingFace Transformers Embeddings instance.
 * Uses the local Xenova/all-MiniLM-L6-v2 model (384 dimensions, normalized).
 * Fully LangChain-managed — zero manual pipeline setup, zero external APIs.
 */
export function createLangChainEmbeddings(): HuggingFaceTransformersEmbeddings {
  return new HuggingFaceTransformersEmbeddings({
    model: 'Xenova/all-MiniLM-L6-v2',
  });
}

/**
 * Generates vector embeddings for an array of texts using LangChain's
 * HuggingFaceTransformersEmbeddings (runs @huggingface/transformers locally in Node.js).
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];
  const embeddings = createLangChainEmbeddings();
  return embeddings.embedDocuments(texts);
}
