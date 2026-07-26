import { Response } from 'express';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { mcpServer } from '../services/mcpService.js';
import prisma from '../lib/prisma.js';

async function getAllMcpTools(workspaceId?: string) {
  const dbTools = await prisma.tool.findMany({
    where: {
      OR: [
        { isCustom: false },
        ...(workspaceId ? [{ workspaceId }] : []),
      ],
    },
  });

  return dbTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.schema,
    isCustom: t.isCustom,
    url: t.url,
  }));
}

export const listMcpTools = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = (req.query['workspaceId'] as string) || (req.params['workspaceId'] as string);
  const tools = await getAllMcpTools(workspaceId);

  res.json({
    jsonrpc: '2.0',
    result: {
      tools,
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
  const workspaceId = (params?.['workspaceId'] as string) || (req.query['workspaceId'] as string) || '';

  if (jsonrpc !== '2.0' && method !== 'tools/list' && method !== 'tools/call') {
    const tools = await getAllMcpTools(workspaceId);
    // Standard response if non-JSON-RPC body
    res.json({
      success: true,
      data: {
        server: 'ForgeAI MCP Protocol Server',
        version: '1.0.0',
        availableTools: tools.map((t) => t.name),
      },
    });
    return;
  }

  if (method === 'tools/list') {
    const tools = await getAllMcpTools(workspaceId);
    res.json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        tools,
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
