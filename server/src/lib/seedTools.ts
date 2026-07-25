import prisma from './prisma.js';
import logger from './logger.js';

const DEFAULT_TOOLS = [
  {
    name: 'search_documents',
    description: 'Search through the workspace knowledge base documents using semantic similarity.',
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
    description: 'Search the web for up-to-date information on a given topic.',
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
    description: 'Execute a read-only SQL query against the workspace database to retrieve structured data.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The SQL SELECT query to execute.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'github_api',
    description: 'Interact with the GitHub API to retrieve repository info, issues, and pull requests.',
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', description: 'The GitHub API endpoint path, e.g. /repos/owner/repo/issues' },
        method: { type: 'string', enum: ['GET'], description: 'HTTP method (read-only GET requests only)' },
      },
      required: ['endpoint'],
    },
  },
  {
    name: 'weather_api',
    description: 'Retrieve current weather conditions and forecasts for any location.',
    schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, coordinates, or zip code.' },
      },
      required: ['location'],
    },
  },
];

export async function seedTools(): Promise<void> {
  try {
    const existingCount = await prisma.tool.count();
    if (existingCount > 0) {
      logger.info({ count: existingCount }, 'Tools already seeded, skipping');
      return;
    }

    await prisma.tool.createMany({
      data: DEFAULT_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        schema: t.schema,
      })),
      skipDuplicates: true,
    });

    logger.info({ count: DEFAULT_TOOLS.length }, 'Default tools seeded successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to seed default tools');
  }
}
