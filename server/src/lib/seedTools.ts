import prisma from './prisma.js';
import logger from './logger.js';

const DEFAULT_TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web live for real-time information, news, and current events.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query to look up on the internet.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'weather_api',
    description: 'Fetch real-time live weather conditions, temperature, and forecasts for any city in the world.',
    schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location (e.g. San Francisco, Tokyo, London, Paris).' },
      },
      required: ['location'],
    },
  },
];

export async function seedTools(): Promise<void> {
  try {
    const allowedNames = DEFAULT_TOOLS.map((t) => t.name);

    // Delete obsolete tools from DB
    await prisma.tool.deleteMany({
      where: {
        name: { notIn: allowedNames },
      },
    });

    for (const tool of DEFAULT_TOOLS) {
      await prisma.tool.upsert({
        where: { name: tool.name },
        update: {
          description: tool.description,
          schema: tool.schema,
        },
        create: {
          name: tool.name,
          description: tool.description,
          schema: tool.schema,
        },
      });
    }

    logger.info({ count: DEFAULT_TOOLS.length }, 'Default tools seeded/updated successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to seed default tools');
  }
}
