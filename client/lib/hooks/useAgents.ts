import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Tool {
  id: string;
  name: string;
  description: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  systemPrompt: string;
  model: string;
  temperature: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  agentTools: { tool: Tool }[];
  agentKnowledge: { document: { id: string; name: string; fileType: string } }[];
  _count: { conversations: number };
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  isPublic?: boolean;
  documentIds?: string[];
  toolIds?: string[];
}

export interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
  isActive: boolean;
}

export function useAgents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: () => api.get<Agent[]>(`/workspaces/${workspaceId}/agents`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useModels(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['models', workspaceId],
    queryFn: () => api.get<ModelOption[]>(`/workspaces/${workspaceId}/agents/models`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useTools(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['tools', workspaceId],
    queryFn: () => api.get<Tool[]>(`/workspaces/${workspaceId}/tools`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useCreateAgent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgentInput) =>
      api.post<Agent>(`/workspaces/${workspaceId}/agents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}

export function useUpdateAgent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAgentInput> }) =>
      api.put<Agent>(`/workspaces/${workspaceId}/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}

export function useDeleteAgent(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}
