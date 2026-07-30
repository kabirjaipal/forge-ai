import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  citations?: unknown;
  toolCalls?: unknown;
  createdAt: string;
  senderId?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  workspaceId: string;
  agentId?: string | null;
  agent?: {
    id: string;
    name: string;
    avatar?: string | null;
    agentTools?: Array<{ tool: { name: string; description: string } }>;
  } | null;

  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: Message[];
}

export interface Analytics {
  documentCount: number;
  agentCount: number;
  conversationCount: number;
  messageCount: number;
  recentConversations: Conversation[];
}

export function useConversations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: () => api.get<Conversation[]>(`/workspaces/${workspaceId}/conversations`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useConversation(workspaceId: string | undefined, conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', workspaceId, conversationId],
    queryFn: () => api.get<Conversation>(`/workspaces/${workspaceId}/conversations/${conversationId}`),
    enabled: !!workspaceId && !!conversationId,
    select: (res) => res.data,
  });
}

export function useCreateConversation(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; agentId?: string }) =>
      api.post<Conversation>(`/workspaces/${workspaceId}/conversations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
    },
  });
}

export function useUpdateConversation(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch<Conversation>(`/workspaces/${workspaceId}/conversations/${id}`, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', workspaceId, variables.id] });
    },
  });
}

export function useDeleteConversation(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
    },
  });
}

export function useDeleteAllConversations(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspaceId}/conversations`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
    },
  });
}

export function useAnalytics(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', workspaceId],
    queryFn: () => api.get<Analytics>(`/workspaces/${workspaceId}/conversations/analytics`),
    enabled: !!workspaceId,
    select: (res) => res.data,
    staleTime: 1000 * 30, // 30 seconds
  });
}
