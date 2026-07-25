import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';

const router = Router();

// API v1 routes
router.use('/api/v1/health', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/workspaces', workspaceRoutes);

// Fallback legacy health check route
router.use('/api', healthRoutes);

export default router;
