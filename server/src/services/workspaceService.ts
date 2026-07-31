import prisma from '../lib/prisma.js';

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string | undefined;
  ownerId: string;
}

export async function getUserWorkspaces(userId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              documents: true,
              agents: true,
              members: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return members.map((m: (typeof members)[number]) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    description: m.workspace.description,
    ownerId: m.workspace.ownerId,
    role: m.role,
    createdAt: m.workspace.createdAt,
    stats: m.workspace._count,
  }));
}

export async function createUserWorkspace(input: CreateWorkspaceInput) {
  const { name, slug, description, ownerId } = input;

  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    const error = new Error('A workspace with this slug already exists');
    (error as any).code = 'SLUG_EXISTS';
    (error as any).statusCode = 409;
    throw error;
  }

  return prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma['$transaction']>[0]>[0]) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        slug,
        description: description || null,
        ownerId,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: ownerId,
        role: 'owner',
      },
    });

    return ws;
  });
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true, image: true },
              },
            },
          },
          _count: {
            select: {
              documents: true,
              agents: true,
              conversations: true,
            },
          },
        },
      },
    },
  });

  if (!member) return null;

  return {
    ...member.workspace,
    userRole: member.role,
  };
}
