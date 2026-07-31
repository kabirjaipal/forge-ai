import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getTools,
} from '../services/agentService.js';
import { fetchAvailableModels } from '../services/groqService.js';

const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  isPublic: z.boolean().optional(),
  documentIds: z.array(z.string()).optional(),
  toolIds: z.array(z.string()).optional(),
});

const updateAgentSchema = createAgentSchema.partial();

function getParamStr(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? (param[0] || '') : param;
}

function getParamStrOpt(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export const listAgents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
  const agents = await getAgents(workspaceId, req.user.id);
  res.json({ success: true, data: agents });
});

export const getAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const agent = await getAgentById(id, workspaceId, req.user.id);
  res.json({ success: true, data: agent });
});

export const createAgentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const workspaceId = getParamStr(req.params['workspaceId']);
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Validation failed';
    throw new AppError(msg, 400, 'VALIDATION_ERROR');
  }
  const agent = await createAgent({ ...parsed.data, workspaceId, userId: req.user.id });
  res.status(201).json({ success: true, data: agent });
});

export const updateAgentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  const parsed = updateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Validation failed';
    throw new AppError(msg, 400, 'VALIDATION_ERROR');
  }
  const agent = await updateAgent(id, workspaceId, req.user.id, parsed.data);
  res.json({ success: true, data: agent });
});

export const deleteAgentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { workspaceId, id } = req.params as { workspaceId: string; id: string };
  await deleteAgent(id, workspaceId, req.user.id);
  res.json({ success: true, data: { deleted: true } });
});

export const listTools = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = getParamStrOpt(req.params['workspaceId']);
  const tools = await getTools(workspaceId);
  res.json({ success: true, data: tools });
});

export const listModelsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const models = await fetchAvailableModels();
  res.json({ success: true, data: models });
});
