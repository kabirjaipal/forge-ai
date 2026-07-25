import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma.js';
import config from './config.js';

const origins = config.CORS_ORIGIN.split(',').map((o) => o.trim());

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: config.JWT_SECRET,
  baseURL: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}`,
  trustedOrigins: origins.length > 0 ? origins : ['http://localhost:3000'],
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
    },
  },
});
