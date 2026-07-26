import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
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
    name: 'web_search',
    description: 'Search the live web for real-time information, news, current affairs, and events.',
    inputSchema: {
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
    _workspaceId: string
  ): Promise<McpToolResult> {
    try {
      switch (toolName) {
        case 'web_search': {
          let rawQuery = (args['query'] || args['q'] || '') as string;
          const cleanQuery = rawQuery
            .replace(/^@\w+\s*/, '')
            .replace(/^(?:search online for|search web for|search for|google|find)\s*/i, '')
            .trim() || rawQuery;

          if (!cleanQuery) {
            return { isError: true, content: [{ type: 'text', text: 'Error: Search query is required.' }] };
          }

          const results: Array<{ title: string; snippet: string; link: string }> = [];

          // 1. Live DuckDuckGo Web Search
          try {
            const ddgRes = await globalThis.fetch(
              `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.5',
                },
              }
            );

            if (ddgRes.ok) {
              const html = await ddgRes.text();
              const matches = html.matchAll(
                /<a[^>]+class="result__snippet"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
              );

              for (const m of matches) {
                let link = m[1] || '';
                if (link.includes('uddg=')) {
                  const u = link.match(/uddg=([^&]+)/);
                  if (u && u[1]) link = decodeURIComponent(u[1]);
                }
                const snippet = m[2]?.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").trim() || '';

                let title = link.split('/')[2]?.replace('www.', '') || 'Web Source';
                if (link.includes('wikipedia.org')) {
                  const page = link.split('/').pop()?.replace(/_/g, ' ');
                  if (page) title = decodeURIComponent(page);
                } else if (link.includes('.gov')) {
                  title = 'Official Government Portal';
                }

                if (snippet && link && !results.some((r) => r.link === link)) {
                  results.push({ title, snippet, link });
                }
              }
            }
          } catch {
            // Ignore DDG network errors
          }

          // 2. Wikipedia Search API if DDG returned empty
          if (results.length === 0) {
            try {
              const wikiRes = await globalThis.fetch(
                `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`
              );
              if (wikiRes.ok) {
                const wikiData = (await wikiRes.json()) as {
                  query?: { search?: Array<{ title: string; snippet: string }> };
                };
                const items = wikiData.query?.search || [];
                for (const item of items.slice(0, 5)) {
                  const title = item.title;
                  const snippet = item.snippet.replace(/<[^>]+>/g, '').trim();
                  const link = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
                  results.push({ title, snippet, link });
                }
              }
            } catch {
              // Ignore
            }
          }

          if (results.length === 0) {
            return {
              isError: true,
              content: [{ type: 'text', text: `No live search results found for query: "${cleanQuery}".` }],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    query: cleanQuery,
                    searchResultsCount: results.length,
                    searchResults: results.slice(0, 6),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'weather_api': {
          const rawLocation = (args['location'] || args['city'] || args['query'] || 'San Francisco') as string;
          const location = rawLocation
            .replace(/^what(?:'s|\s+is)?\s+the\s+weather\s+(?:in|for|at)?\s*/i, '')
            .replace(/^(?:weather|forecast|temperature|how is the weather)\s+(?:in|for|at)?\s*/i, '')
            .replace(/\s+(?:today|now|right now|currently|this week)\??$/i, '')
            .replace(/[?.,!]/g, '')
            .trim() || rawLocation;

          const geoRes = await globalThis.fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
          );

          if (!geoRes.ok) {
            throw new Error(`Geocoding API failed with status ${geoRes.status}`);
          }

          const geoData = (await geoRes.json()) as {
            results?: Array<{ name: string; country: string; latitude: number; longitude: number }>;
          };

          if (!geoData.results || geoData.results.length === 0) {
            return { isError: true, content: [{ type: 'text', text: `Error: Could not find location "${location}".` }] };
          }

          const loc = geoData.results[0]!;
          const weatherRes = await globalThis.fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`
          );

          if (!weatherRes.ok) {
            throw new Error(`Weather API failed with status ${weatherRes.status}`);
          }

          const weatherData = (await weatherRes.json()) as {
            current_weather?: { temperature: number; windspeed: number; weathercode: number };
          };

          const current = weatherData.current_weather;
          if (!current) {
            throw new Error('No weather data returned from Weather API.');
          }

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

        default: {
          const dbTool = await prisma.tool.findFirst({
            where: {
              name: toolName,
              ...(_workspaceId ? { OR: [{ workspaceId: _workspaceId }, { workspaceId: null }] } : {}),
            },
          });

          if (!dbTool || !dbTool.url) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Error: Tool "${toolName}" is not registered.` }],
            };
          }

          const method = (dbTool.method || 'POST').toUpperCase();
          let headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (dbTool.headers && typeof dbTool.headers === 'object') {
            headers = { ...headers, ...(dbTool.headers as Record<string, string>) };
          }

          let response: Response;
          if (method === 'GET') {
            const queryParams = new URLSearchParams(args as Record<string, string>).toString();
            const fullUrl = dbTool.url.includes('?') ? `${dbTool.url}&${queryParams}` : `${dbTool.url}?${queryParams}`;
            response = await globalThis.fetch(fullUrl, { method: 'GET', headers });
          } else {
            response = await globalThis.fetch(dbTool.url, {
              method: 'POST',
              headers,
              body: JSON.stringify(args),
            });
          }

          if (!response.ok) {
            const errText = await response.text();
            return {
              isError: true,
              content: [{ type: 'text', text: `Custom Tool HTTP ${response.status}: ${errText}` }],
            };
          }

          const resultText = await response.text();
          return {
            content: [{ type: 'text', text: resultText }],
          };
        }
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool Execution Failed: ${err.message}` }],
      };
    }
  }
}

export const mcpServer = new ForgeAIMcpServer();
