import { Response } from 'express';
import { z } from 'zod';
import { getUserWorkspaces, createUserWorkspace, getWorkspaceById } from '../services/workspaceService.js';
import { AuthRequest } from '../types/auth.js';
import prisma from '../lib/prisma.js';

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
});

export async function listWorkspaces(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  try {
    const workspaces = await getUserWorkspaces(req.user.id);
    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
}

export async function createWorkspace(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const parseResult = createWorkspaceSchema.safeParse(req.body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues;
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'Validation failed',
      },
    });
    return;
  }

  try {
    const workspace = await createUserWorkspace({
      ...parseResult.data,
      ownerId: req.user.id,
    });
    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred creating workspace',
      },
    });
  }
}

export async function getWorkspace(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Workspace ID required' } });
    return;
  }

  try {
    const workspace = await getWorkspaceById(id, req.user.id);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found or access denied' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
}

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function updateWorkspace(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Workspace ID required' } });
    return;
  }

  const parseResult = updateWorkspaceSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message || 'Validation failed' },
    });
    return;
  }

  try {
    // Verify ownership
    const existing = await getWorkspaceById(id, req.user.id);
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
      return;
    }
    if (existing.ownerId !== req.user.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can update workspace settings' } });
      return;
    }

    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        ...(parseResult.data.name && { name: parseResult.data.name }),
        ...(parseResult.data.description !== undefined && { description: parseResult.data.description }),
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
}

