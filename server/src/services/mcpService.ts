import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { search as duckSearch, SafeSearchType } from 'duck-duck-scrape';
import { searchRelevantChunks } from './ragService.js';
import prisma from '../lib/prisma.js';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function getWeatherCondition(code: number): string {
  switch (code) {
    case 0: return 'Clear sky';
    case 1: return 'Mainly clear';
    case 2: return 'Partly cloudy';
    case 3: return 'Overcast';
    case 45: case 48: return 'Foggy';
    case 51: case 53: case 55: return 'Drizzle';
    case 61: case 63: case 65: return 'Rain';
    case 71: case 73: case 75: return 'Snowfall';
    case 80: case 81: case 82: return 'Rain showers';
    case 95: case 96: case 99: return 'Thunderstorm';
    default: return 'Varied weather conditions';
  }
}

/**
 * Standard MCP Tool Definitions
 */
export const MCP_TOOLS_DEFINITIONS = [
  {
    name: 'search_documents',
    description: 'Search through workspace knowledge base documents using semantic pgvector search.',
    inputSchema: {
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
    description: 'Search the live web for real-time information, news, and current events.',
    inputSchema: {
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
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'github_api',
    description: 'Fetch real live GitHub repository info, stars, open issues, and pull requests.',
    inputSchema: {
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
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location (e.g. San Francisco, Tokyo, London, Paris).' },
      },
      required: ['location'],
    },
  },
];

/**
 * Class wrapping the Model Context Protocol (MCP) Server
 */
export class ForgeAIMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'forgeai-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 1. MCP Tools Listing Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: MCP_TOOLS_DEFINITIONS,
      };
    });

    // 2. MCP Tool Execution Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      const workspaceId = (args?.['workspaceId'] as string) || '';

      const res = await this.executeMcpToolHandler(name, args || {}, workspaceId);
      return res as any;
    });
  }

  public async executeMcpToolHandler(
    toolName: string,
    args: Record<string, unknown>,
    workspaceId: string
  ): Promise<McpToolResult> {
    try {
      switch (toolName) {
        case 'search_documents': {
          const query = (args['query'] || args['q'] || '') as string;
          if (!query || !query.trim()) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: Query parameter is required for search_documents tool.' }],
            };
          }
          const topK = typeof args['topK'] === 'number' ? args['topK'] : 5;
          const matches = await searchRelevantChunks(workspaceId, query, undefined, topK);
          const payload = {
            retrievedContext: matches.map((m) => m.content).join('\n---\n'),
            citations: matches.map((m) => ({ documentName: m.documentName, score: m.score })),
            chunkCount: matches.length,
          };
          return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
        }

        case 'db_query': {
          const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true, name: true, slug: true, createdAt: true },
          });

          const docCount = await prisma.document.count({ where: { workspaceId } });
          const chunkCount = await prisma.documentChunk.count({
            where: { document: { workspaceId } },
          });
          const agentCount = await prisma.agent.count({ where: { workspaceId } });
          const conversationCount = await prisma.conversation.count({ where: { workspaceId } });
          const messageCount = await prisma.message.count({
            where: { conversation: { workspaceId } },
          });

          const payload = {
            workspace,
            databaseMetrics: {
              documents: docCount,
              totalVectorChunks: chunkCount,
              configuredAgents: agentCount,
              activeConversations: conversationCount,
              totalMessagesLogged: messageCount,
            },
          };
          return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
        }

        case 'web_search': {
          let rawQuery = (args['query'] || args['q'] || '') as string;
          const cleanQuery = rawQuery.replace(/@\w+/g, '').trim();

          if (!cleanQuery) {
            return { isError: true, content: [{ type: 'text', text: 'Error: Search query is required.' }] };
          }

          try {
            const searchResults = await duckSearch(cleanQuery, {
              safeSearch: SafeSearchType.STRICT,
            });

            const results = (searchResults.results || []).slice(0, 5).map((r: any) => ({
              title: r.title,
              snippet: r.snippet || r.description || r.title || '',
              link: r.url,
            }));

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      query: cleanQuery,
                      searchResultsCount: results.length,
                      searchResults: results,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } catch (err: any) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Web Search Error: ${err.message}` }],
            };
          }
        }

        
        case 'weather_api': {
          const location = (args['location'] || args['city'] || 'San Francisco') as string;
          const geoRes = await globalThis.fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
          );

          if (!geoRes.ok) throw new Error(`Geocoding API status ${geoRes.status}`);
          const geoData = (await geoRes.json()) as {
            results?: Array<{ name: string; country: string; latitude: number; longitude: number }>;
          };

          if (!geoData.results || geoData.results.length === 0) {
            return { isError: true, content: [{ type: 'text', text: `Error: Location "${location}" not found.` }] };
          }

          const loc = geoData.results[0]!;
          const weatherRes = await globalThis.fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`
          );

          if (!weatherRes.ok) throw new Error(`Weather API status ${weatherRes.status}`);
          const weatherData = (await weatherRes.json()) as {
            current_weather?: { temperature: number; windspeed: number; weathercode: number };
          };

          const current = weatherData.current_weather;
          if (!current) throw new Error('No weather data available');

          const tempC = current.temperature;
          const tempF = Math.round((tempC * 9) / 5 + 32);
          const condition = getWeatherCondition(current.weathercode);

          const payload = {
            location: `${loc.name}, ${loc.country}`,
            coordinates: { latitude: loc.latitude, longitude: loc.longitude },
            temperatureCelsius: `${tempC}°C`,
            temperatureFahrenheit: `${tempF}°F`,
            condition,
            windSpeedKmh: `${current.windspeed} km/h`,
          };
          return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
        }

        case 'github_api': {
          let endpoint = (args['endpoint'] || args['repo'] || args['query'] || 'repos/facebook/react') as string;
          endpoint = endpoint.replace(/^\/+/, '');
          if (!endpoint.startsWith('repos/') && !endpoint.startsWith('search/') && endpoint.includes('/')) {
            endpoint = `repos/${endpoint}`;
          }

          const response = await globalThis.fetch(`https://api.github.com/${endpoint}`, {
            headers: {
              'User-Agent': 'ForgeAI-MCP-Server/1.0',
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`GitHub API status ${response.status}: ${errText}`);
          }

          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify({ endpoint: `https://api.github.com/${endpoint}`, data }, null, 2) }] };
        }

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Error: MCP tool "${toolName}" is not registered.` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `MCP Execution Error: ${err.message}` }],
      };
    }
  }
}

export const mcpServer = new ForgeAIMcpServer();
