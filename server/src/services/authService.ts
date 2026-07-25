import prisma from '../lib/prisma.js';

export async function getUserWithWorkspaces(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      workspaceMembers: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    workspaces: user.workspaceMembers.map((m) => ({
      ...m.workspace,
      role: m.role,
    })),
  };
}
