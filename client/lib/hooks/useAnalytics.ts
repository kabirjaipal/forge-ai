import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api/v1';

export interface AnalyticsStats {
  totalDocuments: number;
  totalChunks: number;
  totalAgents: number;
  totalConversations: number;
  totalMessages: number;
  estimatedTokenUsage: number;
  recentActivity: Array<{
    id: string;
    type: 'document' | 'message' | 'agent';
    title: string;
    timestamp: string;
  }>;
}

export function useAnalytics(workspaceId?: string) {
  return useQuery<AnalyticsStats>({
    queryKey: ['analytics', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null as any;
      const res = await fetch(`${API_BASE}/analytics?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      return json.data;
    },
    enabled: !!workspaceId,
  });
}
