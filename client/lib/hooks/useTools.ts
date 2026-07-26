import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MCPTool {
  id: string;
  workspaceId?: string | null;
  name: string;
  description: string;
  schema: any;
  url?: string | null;
  method?: string | null;
  headers?: any;
  isCustom: boolean;
  createdAt: string;
}

export interface CreateToolInput {
  name: string;
  description: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  schema?: any;
}

export function useTools(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['tools', workspaceId],
    queryFn: () => api.get<MCPTool[]>(`/workspaces/${workspaceId}/tools`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useCreateTool(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateToolInput) =>
      api.post<MCPTool>(`/workspaces/${workspaceId}/tools`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}

export function useUpdateTool(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateToolInput> }) =>
      api.put<MCPTool>(`/workspaces/${workspaceId}/tools/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}

export function useDeleteTool(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/workspaces/${workspaceId}/tools/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
    },
  });
}

export function useTestTool(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: Record<string, any> }) =>
      api.post<any>(`/workspaces/${workspaceId}/tools/${id}/test`, { args }),
  });
}
