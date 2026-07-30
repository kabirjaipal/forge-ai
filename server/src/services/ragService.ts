import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import prisma from '../lib/prisma.js';
import { createLangChainEmbeddings } from './embeddingService.js';

export interface RAGMatch {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/**
 * Searches for top-K document chunks across agent-linked documents
 * using LangChain MemoryVectorStore — eliminates manual cosine similarity loop.
 * Chunks are loaded from DB, reconstructed as LangChain Documents, then
 * similarity search is delegated entirely to LangChain.
 */
export async function searchRelevantChunks(
  _workspaceId: string,
  query: string,
  agentId?: string,
  topK = 4,
): Promise<RAGMatch[]> {
  if (!query || query.trim().length === 0 || !agentId) return [];

  // 1. Identify document IDs linked to this agent
  const agentKnowledge = await prisma.agentKnowledge.findMany({
    where: { agentId },
    select: { documentId: true },
  });
  const documentIds = agentKnowledge.map((ak) => ak.documentId);

  if (documentIds.length === 0) return [];

  // 2. Fetch all chunks for target agent documents
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: { in: documentIds } },
    include: { document: { select: { name: true } } },
  });

  if (chunks.length === 0) return [];

  // 3. Build LangChain Document objects with stored embeddings
  const langchainDocs: Document[] = [];
  const precomputedEmbeddings: number[][] = [];
  const validChunks: typeof chunks = [];

  for (const chunk of chunks) {
    if (!chunk.embedding) continue;

    let vector: number[] = [];
    try {
      vector = typeof chunk.embedding === 'string'
        ? JSON.parse(chunk.embedding)
        : chunk.embedding;
    } catch {
      continue;
    }

    if (!Array.isArray(vector) || vector.length === 0) continue;

    langchainDocs.push(
      new Document({
        pageContent: chunk.content,
        metadata: {
          documentId: chunk.documentId,
          documentName: chunk.document.name,
          chunkIndex: chunk.chunkIndex,
        },
      })
    );
    precomputedEmbeddings.push(vector);
    validChunks.push(chunk);
  }

  if (langchainDocs.length === 0) {
    // Fallback: return top initial chunks if no embeddings are stored yet
    return chunks.slice(0, topK).map((c) => ({
      documentId: c.documentId,
      documentName: c.document.name,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: 1.0,
    }));
  }

  // 4. Build MemoryVectorStore from pre-computed embeddings (no re-embedding needed)
  const embeddings = createLangChainEmbeddings();
  const vectorStore = await MemoryVectorStore.fromExistingIndex(embeddings);
  await vectorStore.addVectors(precomputedEmbeddings, langchainDocs);

  // 5. Similarity search via LangChain — cosine similarity handled internally
  const results = await vectorStore.similaritySearchWithScore(query, topK);

  // Filter noise and map to RAGMatch shape
  const matches: RAGMatch[] = results
    .filter(([, score]) => score > 0.05)
    .map(([doc, score]) => ({
      documentId: doc.metadata['documentId'] as string,
      documentName: doc.metadata['documentName'] as string,
      chunkIndex: doc.metadata['chunkIndex'] as number,
      content: doc.pageContent,
      score: Math.round(score * 1000) / 1000,
    }));

  // Fallback: if no chunks passed the threshold, return top-K initial chunks
  if (matches.length === 0 && chunks.length > 0) {
    return chunks.slice(0, topK).map((c) => ({
      documentId: c.documentId,
      documentName: c.document.name,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: 1.0,
    }));
  }

  return matches;
}
