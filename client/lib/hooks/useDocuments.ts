import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Document {
  id: string;
  name: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { chunks: number };
}

export function useDocuments(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => api.get<Document[]>(`/workspaces/${workspaceId}/documents`),
    enabled: !!workspaceId,
    select: (res) => res.data ?? [],
  });
}

export function useDeleteDocument(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      api.delete(`/workspaces/${workspaceId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
  });
}

export async function uploadDocument(
  workspaceId: string,
  file: File,
  name?: string,
): Promise<{ success: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error?.message || 'Upload failed' };
  return { success: true };
}
