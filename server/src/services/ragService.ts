import prisma from '../lib/prisma.js';
import { generateEmbeddings, cosineSimilarity } from './embeddingService.js';

export interface RAGMatch {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/**
 * Searches for top-K document chunks across workspace or agent-linked documents
 * that are semantically relevant to the user query.
 */
export async function searchRelevantChunks(
  workspaceId: string,
  query: string,
  agentId?: string,
  topK = 4,
): Promise<RAGMatch[]> {
  if (!query || query.trim().length === 0) return [];

  // 1. Identify target document IDs
  let documentIds: string[] = [];

  if (agentId) {
    const agentKnowledge = await prisma.agentKnowledge.findMany({
      where: { agentId },
      select: { documentId: true },
    });
    documentIds = agentKnowledge.map((ak) => ak.documentId);
  }

  // If no agent-specific docs, fallback to searching all completed documents in workspace
  if (documentIds.length === 0) {
    const workspaceDocs = await prisma.document.findMany({
      where: { workspaceId, status: 'completed' },
      select: { id: true },
    });
    documentIds = workspaceDocs.map((doc) => doc.id);
  }

  if (documentIds.length === 0) return [];

  // 2. Generate embedding for user query
  const [queryEmbedding] = await generateEmbeddings([query]);
  if (!queryEmbedding) return [];

  // 3. Fetch all chunks for target documents
  const chunks = await prisma.documentChunk.findMany({
    where: {
      documentId: { in: documentIds },
    },
    include: {
      document: {
        select: { name: true },
      },
    },
  });

  if (chunks.length === 0) return [];

  // 4. Calculate similarity scores
  const scoredMatches: RAGMatch[] = [];

  for (const chunk of chunks) {
    if (!chunk.embedding) continue;

    let chunkVector: number[] = [];
    try {
      chunkVector = typeof chunk.embedding === 'string' ? JSON.parse(chunk.embedding) : chunk.embedding;
    } catch {
      continue;
    }

    const score = cosineSimilarity(queryEmbedding, chunkVector);
    // Only include matches with positive similarity threshold
    if (score > 0.05) {
      scoredMatches.push({
        documentId: chunk.documentId,
        documentName: chunk.document.name,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score,
      });
    }
  }

  // 5. Sort by similarity score descending and take top K
  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches.slice(0, topK);
}
