import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { PGVectorStore } from '@langchain/pgvector';
import pg from 'pg';
import prisma from '../lib/prisma.js';
import { createLangChainEmbeddings } from './embeddingService.js';

export interface RAGMatch {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

let pgPool: pg.Pool | null = null;
function getPgPool(): pg.Pool | null {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) return null;
  if (!pgPool) {
    pgPool = new pg.Pool({ connectionString: dbUrl });
  }
  return pgPool;
}

/**
 * Searches for top-K document chunks across agent-linked documents using LangChain.
 * Prefers native PostgreSQL vector search via @langchain/pgvector when DATABASE_URL is active,
 * falling back to in-memory LangChain MemoryVectorStore.
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

  const embeddings = createLangChainEmbeddings();
  const pool = getPgPool();

  // Attempt native PostgreSQL @langchain/pgvector similarity search
  if (pool) {
    try {
      const pgVectorStore = await PGVectorStore.initialize(embeddings, {
        postgresConnectionOptions: { connectionString: process.env['DATABASE_URL'] },
        tableName: 'DocumentChunk',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content',
        },
      });

      const pgResults = await pgVectorStore.similaritySearchWithScore(query, topK, {
        documentId: { in: documentIds },
      });

      if (pgResults && pgResults.length > 0) {
        return pgResults.map(([doc, score]) => ({
          documentId: (doc.metadata['documentId'] as string) || '',
          documentName: (doc.metadata['documentName'] as string) || 'Document',
          chunkIndex: (doc.metadata['chunkIndex'] as number) || 0,
          content: doc.pageContent,
          score: Math.round(score * 1000) / 1000,
        }));
      }
    } catch {
      // Fallback to chunk retrieval if pgvector extension isn't initialized on table
    }
  }

  // 2. Fetch all chunks for target agent documents (fallback mode)
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
    return chunks.slice(0, topK).map((c) => ({
      documentId: c.documentId,
      documentName: c.document.name,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: 1.0,
    }));
  }

  // 4. Build MemoryVectorStore from pre-computed embeddings
  const vectorStore = await MemoryVectorStore.fromExistingIndex(embeddings);
  await vectorStore.addVectors(precomputedEmbeddings, langchainDocs);

  // 5. Similarity search via LangChain MemoryVectorStore
  const results = await vectorStore.similaritySearchWithScore(query, topK);

  const matches: RAGMatch[] = results
    .filter(([, score]) => score > 0.05)
    .map(([doc, score]) => ({
      documentId: doc.metadata['documentId'] as string,
      documentName: doc.metadata['documentName'] as string,
      chunkIndex: doc.metadata['chunkIndex'] as number,
      content: doc.pageContent,
      score: Math.round(score * 1000) / 1000,
    }));

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

