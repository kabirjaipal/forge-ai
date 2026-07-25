'use client';

import React, { useState } from 'react';
import { Layers, Plus, Loader2 } from 'lucide-react';
import { useAuth, type Workspace } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (workspace: Workspace) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const { setCurrentWorkspace, refreshWorkspaces } = useAuth();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const slug = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      const res = await api.post<{ id: string; name: string; slug: string; role?: string }>('/workspaces', {
        name: name.trim(),
        slug,
      });
      if (res.success && res.data) {
        await refreshWorkspaces();
        const ws: Workspace = { ...res.data, role: res.data.role || 'owner' };
        setCurrentWorkspace(ws);
        setName('');
        onOpenChange(false);
        onSuccess?.(ws);
      } else {
        setError(res.error?.message || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Add a separate workspace for your team or projects.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 text-left">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Acme Corp / Marketing"
              autoFocus
              className="bg-background border-border h-10 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="default"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="default"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
