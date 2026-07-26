import { Response } from 'express';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { mcpServer } from '../services/mcpService.js';

export const listTools = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.params['workspaceId'] as string;

  // Assert member access to workspace
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user!.id },
  });
  if (!member) {
    throw new AppError('Workspace access denied', 403, 'FORBIDDEN');
  }

  const tools = await prisma.tool.findMany({
    where: {
      OR: [
        { isCustom: false },
        { workspaceId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: tools,
  });
});

export const createCustomTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.params['workspaceId'] as string;
  const { name, description, schema, url, method, headers } = req.body;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user!.id },
  });
  if (!member) {
    throw new AppError('Workspace access denied', 403, 'FORBIDDEN');
  }

  if (!name || !description || !url) {
    throw new AppError('Name, description, and target URL are required', 400, 'BAD_REQUEST');
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const existing = await prisma.tool.findUnique({
    where: { name: cleanName },
  });
  if (existing) {
    throw new AppError(`A tool with the name '${cleanName}' already exists`, 409, 'ALREADY_EXISTS');
  }

  const tool = await prisma.tool.create({
    data: {
      workspaceId,
      name: cleanName,
      description,
      schema: schema || { type: 'object', properties: {} },
      url,
      method: method ? method.toUpperCase() : 'POST',
      headers: headers || null,
      isCustom: true,
    },
  });

  res.status(201).json({
    success: true,
    data: tool,
  });
});

export const updateCustomTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.params['workspaceId'] as string;
  const id = req.params['id'] as string;
  const { name, description, schema, url, method, headers } = req.body;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user!.id },
  });
  if (!member) {
    throw new AppError('Workspace access denied', 403, 'FORBIDDEN');
  }

  const existing = await prisma.tool.findFirst({
    where: { id, workspaceId, isCustom: true },
  });

  if (!existing) {
    throw new AppError('Custom tool not found in workspace', 404, 'NOT_FOUND');
  }

  let cleanName = existing.name;
  if (name && name !== existing.name) {
    cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const nameConflict = await prisma.tool.findUnique({ where: { name: cleanName } });
    if (nameConflict) {
      throw new AppError(`A tool with the name '${cleanName}' already exists`, 409, 'ALREADY_EXISTS');
    }
  }

  const updatedTool = await prisma.tool.update({
    where: { id },
    data: {
      name: cleanName,
      ...(description !== undefined && { description }),
      ...(schema !== undefined && { schema }),
      ...(url !== undefined && { url }),
      ...(method !== undefined && { method: method.toUpperCase() }),
      ...(headers !== undefined && { headers }),
    },
  });

  res.json({
    success: true,
    data: updatedTool,
  });
});

export const deleteCustomTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.params['workspaceId'] as string;
  const id = req.params['id'] as string;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user!.id },
  });
  if (!member) {
    throw new AppError('Workspace access denied', 403, 'FORBIDDEN');
  }

  const existing = await prisma.tool.findFirst({
    where: { id, workspaceId, isCustom: true },
  });

  if (!existing) {
    throw new AppError('Custom tool not found in workspace', 404, 'NOT_FOUND');
  }

  await prisma.tool.delete({
    where: { id },
  });

  res.json({
    success: true,
    data: { message: 'Tool deleted successfully' },
  });
});

export const testCustomTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.params['workspaceId'] as string;
  const id = req.params['id'] as string;
  const { args } = req.body;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user!.id },
  });
  if (!member) {
    throw new AppError('Workspace access denied', 403, 'FORBIDDEN');
  }

  const tool = await prisma.tool.findFirst({
    where: { id, OR: [{ workspaceId }, { isCustom: false }] },
  });

  if (!tool) {
    throw new AppError('Tool not found', 404, 'NOT_FOUND');
  }

  const result = await mcpServer.executeMcpToolHandler(tool.name, args || {}, workspaceId);

  res.json({
    success: true,
    data: result,
  });
});
