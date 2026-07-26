import prisma from './prisma.js';
import logger from './logger.js';

const DEFAULT_TOOLS = [
  {
    name: 'search_documents',
    description: 'Search through workspace documents using semantic pgvector search.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query to find relevant document chunks.' },
        topK: { type: 'number', description: 'Maximum number of results to return (default: 5)', default: 5 },
      },
      required: ['query'],
    },
  },
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
    name: 'db_query',
    description: 'Query live workspace metrics, document count, vector chunk stats, agents, and message counts.',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'github_api',
    description: 'Fetch real live GitHub repository info, stars, open issues, and pull requests.',
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', description: 'GitHub API endpoint path or repository name, e.g. repos/facebook/react or repos/vercel/next.js' },
      },
      required: ['endpoint'],
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
