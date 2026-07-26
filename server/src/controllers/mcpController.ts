import { Response } from 'express';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { mcpServer, MCP_TOOLS_DEFINITIONS } from '../services/mcpService.js';

export const listMcpTools = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({
    jsonrpc: '2.0',
    result: {
      tools: MCP_TOOLS_DEFINITIONS,
    },
  });
});

export const handleMcpRpc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jsonrpc, method, params, id } = req.body as {
    jsonrpc?: string;
    method?: string;
    params?: any;
    id?: string | number;
  };

  if (jsonrpc !== '2.0' && method !== 'tools/list' && method !== 'tools/call') {
    // Standard response if non-JSON-RPC body
    res.json({
      success: true,
      data: {
        server: 'ForgeAI MCP Protocol Server',
        version: '1.0.0',
        availableTools: MCP_TOOLS_DEFINITIONS.map((t) => t.name),
      },
    });
    return;
  }

  if (method === 'tools/list') {
    res.json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        tools: MCP_TOOLS_DEFINITIONS,
      },
    });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const workspaceId = (args?.['workspaceId'] as string) || (req.params['workspaceId'] as string) || '';

    if (!name) {
      throw new AppError('MCP tool name is required', 400, 'INVALID_MCP_REQUEST');
    }

    const mcpResult = await mcpServer.executeMcpToolHandler(name, args || {}, workspaceId);
    res.json({
      jsonrpc: '2.0',
      id: id || 1,
      result: mcpResult,
    });
    return;
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id: id || 1,
    error: {
      code: -32601,
      message: `Method '${method}' not found`,
    },
  });
});
