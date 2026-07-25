import { Response } from 'express';
import { getUserWithWorkspaces } from '../services/authService.js';
import { AuthRequest } from '../types/auth.js';

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    });
    return;
  }

  try {
    const userWithWorkspaces = await getUserWithWorkspaces(req.user.id);
    if (!userWithWorkspaces) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: userWithWorkspaces,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
}
