import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma.js';
import config from './config.js';
import logger from './logger.js';

const origins = config.CORS_ORIGIN.split(',').map((o) => o.trim());

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: config.BETTER_AUTH_SECRET,
  baseURL: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}`,
  trustedOrigins: origins.length > 0 ? origins : ['http://localhost:3000'],
  socialProviders: {
    ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: config.GITHUB_CLIENT_ID,
            clientSecret: config.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create a personal workspace for every new user on the server side.
          // This runs inside the Better Auth transaction — no frontend race condition.
          try {
            const displayName = user.name || user.email.split('@')[0];
            const slug = `ws-${user.id.slice(0, 8).toLowerCase()}-${Date.now().toString(36)}`;

            const workspace = await prisma.workspace.create({
              data: {
                name: `${displayName}'s Workspace`,
                slug,
                ownerId: user.id,
              },
            });

            await prisma.workspaceMember.create({
              data: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'owner',
              },
            });

            logger.info({ userId: user.id, workspaceId: workspace.id }, 'Auto-created personal workspace for new user');
          } catch (err) {
            // Non-fatal: log and continue — user can create workspace manually via dashboard
            logger.error({ err, userId: user.id }, 'Failed to auto-create workspace for new user');
          }
        },
      },
    },
  },
});
