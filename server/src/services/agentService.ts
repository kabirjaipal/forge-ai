import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export interface CreateAgentInput {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string | undefined;
  systemPrompt: string;
  model?: string | undefined;
  temperature?: number | undefined;
  isPublic?: boolean | undefined;
  documentIds?: string[] | undefined;
  toolIds?: string[] | undefined;
}

export interface UpdateAgentInput {
  name?: string | undefined;
  description?: string | undefined;
  systemPrompt?: string | undefined;
  model?: string | undefined;
  temperature?: number | undefined;
  isPublic?: boolean | undefined;
  documentIds?: string[] | undefined;
  toolIds?: string[] | undefined;
}

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
  if (!member) throw new AppError('Workspace not found or access denied', 403, 'FORBIDDEN');
  return member;
}

export async function getAgents(workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  return prisma.agent.findMany({
    where: { workspaceId },
    include: {
      agentTools: { include: { tool: true } },
      agentKnowledge: { include: { document: { select: { id: true, name: true, fileType: true } } } },
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAgentById(id: string, workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const agent = await prisma.agent.findFirst({
    where: { id, workspaceId },
    include: {
      agentTools: { include: { tool: true } },
      agentKnowledge: { include: { document: { select: { id: true, name: true, fileType: true } } } },
      _count: { select: { conversations: true } },
    },
  });
  if (!agent) throw new AppError('Agent not found', 404, 'NOT_FOUND');
  return agent;
}

export async function createAgent(input: CreateAgentInput) {
  const { workspaceId, userId, name, description, systemPrompt, model, temperature, isPublic, documentIds, toolIds } = input;
  await assertWorkspaceMember(workspaceId, userId);

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.create({
      data: {
        workspaceId,
        name,
        description: description || null,
        systemPrompt,
        model: model || 'gpt-4o-mini',
        temperature: temperature ?? 0.7,
        isPublic: isPublic ?? false,
      },
    });

    // Attach knowledge documents
    if (documentIds && documentIds.length > 0) {
      await tx.agentKnowledge.createMany({
        data: documentIds.map((documentId) => ({ agentId: agent.id, documentId })),
        skipDuplicates: true,
      });
    }

    // Attach tools
    if (toolIds && toolIds.length > 0) {
      await tx.agentTool.createMany({
        data: toolIds.map((toolId) => ({ agentId: agent.id, toolId })),
        skipDuplicates: true,
      });
    }

    return agent;
  });
}

export async function updateAgent(id: string, workspaceId: string, userId: string, input: UpdateAgentInput) {
  await assertWorkspaceMember(workspaceId, userId);

  const agent = await prisma.agent.findFirst({ where: { id, workspaceId } });
  if (!agent) throw new AppError('Agent not found', 404, 'NOT_FOUND');

  const { documentIds, toolIds, ...agentData } = input;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.agent.update({
      where: { id },
      data: {
        ...(agentData.name && { name: agentData.name }),
        ...(agentData.description !== undefined && { description: agentData.description }),
        ...(agentData.systemPrompt && { systemPrompt: agentData.systemPrompt }),
        ...(agentData.model && { model: agentData.model }),
        ...(agentData.temperature !== undefined && { temperature: agentData.temperature }),
        ...(agentData.isPublic !== undefined && { isPublic: agentData.isPublic }),
      },
    });

    // Replace knowledge base
    if (documentIds !== undefined) {
      await tx.agentKnowledge.deleteMany({ where: { agentId: id } });
      if (documentIds.length > 0) {
        await tx.agentKnowledge.createMany({
          data: documentIds.map((documentId) => ({ agentId: id, documentId })),
          skipDuplicates: true,
        });
      }
    }

    // Replace tools
    if (toolIds !== undefined) {
      await tx.agentTool.deleteMany({ where: { agentId: id } });
      if (toolIds.length > 0) {
        await tx.agentTool.createMany({
          data: toolIds.map((toolId) => ({ agentId: id, toolId })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  });
}

export async function deleteAgent(id: string, workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);

  const agent = await prisma.agent.findFirst({ where: { id, workspaceId } });
  if (!agent) throw new AppError('Agent not found', 404, 'NOT_FOUND');

  await prisma.agent.delete({ where: { id } });
  return { deleted: true };
}

export async function getTools(workspaceId?: string) {
  return prisma.tool.findMany({
    where: {
      OR: [
        { isCustom: false },
        ...(workspaceId ? [{ workspaceId }] : []),
      ],
    },
    orderBy: { name: 'asc' },
  });
}
