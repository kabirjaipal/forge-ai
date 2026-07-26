import { Router, Request, Response } from 'express';
import { getWorkspaceAnalytics } from '../services/analyticsService.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.query['workspaceId'] as string) || '';
    if (!workspaceId) {
      res.status(400).json({ success: false, error: 'workspaceId query param is required.' });
      return;
    }
    const stats = await getWorkspaceAnalytics(workspaceId);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
