import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import documentRoutes from './documentRoutes.js';
import agentRoutes from './agentRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import mcpRoutes from './mcpRoutes.js';

const router = Router();

// API v1 routes
router.use('/api/v1/health', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/workspaces', workspaceRoutes);
router.use('/api/v1/mcp', mcpRoutes);

// Workspace-scoped resources
router.use('/api/v1/workspaces/:workspaceId/documents', documentRoutes);
router.use('/api/v1/workspaces/:workspaceId/agents', agentRoutes);
router.use('/api/v1/workspaces/:workspaceId/conversations', conversationRoutes);

// Analytics routes
router.use('/api/v1/analytics', analyticsRoutes);

// health check route
router.use('/api', healthRoutes);

export default router;
