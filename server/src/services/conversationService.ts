import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
  if (!member) throw new AppError('Workspace not found or access denied', 403, 'FORBIDDEN');
  return member;
}

export async function getConversations(workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  return prisma.conversation.findMany({
    where: { workspaceId },
    include: {
      agent: { select: { id: true, name: true, avatar: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getConversationById(id: string, workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const convo = await prisma.conversation.findFirst({
    where: { id, workspaceId },
    include: {
      agent: { select: { id: true, name: true, avatar: true, systemPrompt: true, model: true, temperature: true, agentTools: { include: { tool: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          citations: true,
          toolCalls: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });
  if (!convo) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  return convo;
}

export async function createConversation(workspaceId: string, userId: string, title: string, agentId?: string) {
  await assertWorkspaceMember(workspaceId, userId);

  if (agentId) {
    const agent = await prisma.agent.findFirst({ where: { id: agentId, workspaceId } });
    if (!agent) throw new AppError('Agent not found', 404, 'NOT_FOUND');
  }

  return prisma.conversation.create({
    data: {
      workspaceId,
      title,
      agentId: agentId || null,
    },
    include: {
      agent: { select: { id: true, name: true, avatar: true } },
    },
  });
}

export async function updateConversationTitle(id: string, workspaceId: string, userId: string, title: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const convo = await prisma.conversation.findFirst({ where: { id, workspaceId } });
  if (!convo) throw new AppError('Conversation not found', 404, 'NOT_FOUND');

  return prisma.conversation.update({
    where: { id },
    data: { title: title.trim() },
  });
}

export async function deleteConversation(id: string, workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const convo = await prisma.conversation.findFirst({ where: { id, workspaceId } });
  if (!convo) throw new AppError('Conversation not found', 404, 'NOT_FOUND');

  await prisma.conversation.delete({ where: { id } });
  return { deleted: true };
}

export async function deleteAllConversations(workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  await prisma.conversation.deleteMany({ where: { workspaceId } });
  return { deletedAll: true };
}

export async function addMessage(
  conversationId: string,
  workspaceId: string,
  userId: string,
  role: string,
  content: string,
  citations?: unknown,
  toolCalls?: unknown,
) {
  await assertWorkspaceMember(workspaceId, userId);

  const convo = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
  if (!convo) throw new AppError('Conversation not found', 404, 'NOT_FOUND');

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: role === 'user' ? userId : null,
      role,
      content,
      citations: citations as any || null,
      toolCalls: toolCalls as any || null,
    },
  });

  // Update conversation's updatedAt timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function getAnalytics(workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const [documentCount, agentCount, conversationCount, messageCount, recentConversations] =
    await Promise.all([
      prisma.document.count({ where: { workspaceId } }),
      prisma.agent.count({ where: { workspaceId } }),
      prisma.conversation.count({ where: { workspaceId } }),
      prisma.message.count({ where: { conversation: { workspaceId } } }),
      prisma.conversation.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          agent: { select: { name: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

  return {
    documentCount,
    agentCount,
    conversationCount,
    messageCount,
    recentConversations,
  };
}
