import prisma from '../lib/prisma.js';

export interface AnalyticsStats {
  totalDocuments: number;
  totalChunks: number;
  totalAgents: number;
  totalConversations: number;
  totalMessages: number;
  estimatedTokenUsage: number;
  recentActivity: Array<{
    id: string;
    type: 'document' | 'message' | 'agent';
    title: string;
    timestamp: string;
  }>;
}

export async function getWorkspaceAnalytics(workspaceId: string): Promise<AnalyticsStats> {
  const [docCount, chunkCount, agentCount, convCount, msgCount] = await Promise.all([
    prisma.document.count({ where: { workspaceId } }),
    prisma.documentChunk.count({
      where: { document: { workspaceId } },
    }),
    prisma.agent.count({ where: { workspaceId } }),
    prisma.conversation.count({ where: { workspaceId } }),
    prisma.message.count({
      where: { conversation: { workspaceId } },
    }),
  ]);

  // Estimate total tokens (rough estimate ~4 chars per token)
  const messages = await prisma.message.findMany({
    where: { conversation: { workspaceId } },
    select: { content: true, createdAt: true, id: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  const totalCharCount = messages.reduce((acc: number, m: { content: string }) => acc + (m.content?.length || 0), 0);
  const estimatedTokenUsage = Math.round(totalCharCount / 4) + msgCount * 150;

  const recentActivity = messages.slice(0, 5).map((m: { id: string; content: string; createdAt: Date }) => ({
    id: m.id,
    type: 'message' as const,
    title: `Message: "${m.content.slice(0, 40)}..."`,
    timestamp: m.createdAt.toISOString(),
  }));

  return {
    totalDocuments: docCount,
    totalChunks: chunkCount,
    totalAgents: agentCount,
    totalConversations: convCount,
    totalMessages: msgCount,
    estimatedTokenUsage,
    recentActivity,
  };
}
