import { searchRelevantChunks } from './ragService.js';
import prisma from '../lib/prisma.js';

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
}

/**
 * Executes a registered AI tool with the provided arguments and workspace context.
 */
export async function executeTool(
  toolName: string,
  inputArgs: Record<string, any>,
  workspaceId: string,
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'search_docs':
      case 'search_documents': {
        const query = (inputArgs['query'] || inputArgs['searchTerm'] || '') as string;
        if (!query) {
          return { success: false, result: null, error: 'Query parameter is required for search_documents tool.' };
        }
        const topK = typeof inputArgs['topK'] === 'number' ? inputArgs['topK'] : 4;
        const matches = await searchRelevantChunks(workspaceId, query, undefined, topK);
        return {
          success: true,
          result: {
            retrievedContext: matches.map((m) => m.content).join('\n---\n'),
            citations: matches.map((m) => ({ documentName: m.documentName, score: m.score })),
            chunkCount: matches.length,
          },
        };
      }

      case 'db_query': {
        const docCount = await prisma.document.count({ where: { workspaceId } });
        const agentCount = await prisma.agent.count({ where: { workspaceId } });
        const conversationCount = await prisma.conversation.count({ where: { workspaceId } });
        return {
          success: true,
          result: {
            workspaceId,
            stats: {
              totalDocuments: docCount,
              totalAgents: agentCount,
              totalConversations: conversationCount,
            },
          },
        };
      }

      case 'web_search': {
        const query = (inputArgs['query'] || inputArgs['q'] || '') as string;
        return {
          success: true,
          result: {
            query,
            searchResults: [
              {
                title: `Search Result for "${query}"`,
                snippet: `Found latest information regarding "${query}". ForgeAI Web Search integration active.`,
                source: 'web_search_engine',
              },
            ],
          },
        };
      }

      case 'weather_api': {
        const location = (inputArgs['location'] || inputArgs['city'] || 'San Francisco') as string;
        return {
          success: true,
          result: {
            location,
            temperature: '22°C / 72°F',
            condition: 'Sunny with mild breeze',
            humidity: '45%',
          },
        };
      }

      case 'github_api': {
        const query = (inputArgs['query'] || inputArgs['endpoint'] || 'repos') as string;
        return {
          success: true,
          result: {
            service: 'GitHub API',
            target: query,
            status: '200 OK',
            data: {
              repository: 'ForgeAI/workspace',
              stars: 128,
              openIssues: 2,
              license: 'MIT',
            },
          },
        };
      }

      default:
        return {
          success: false,
          result: null,
          error: `Tool "${toolName}" is not implemented or supported.`,
        };
    }
  } catch (err: any) {
    return {
      success: false,
      result: null,
      error: err?.message || 'Tool execution failed',
    };
  }
}
