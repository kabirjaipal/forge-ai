'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  useAgents,
  useTools,
  useCreateAgent,
  useDeleteAgent,
  useUpdateAgent,
  type Agent,
  type CreateAgentInput,
} from '@/lib/hooks/useAgents';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const MODEL_OPTIONS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq Fast)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

function AgentFormModal({
  agent,
  workspaceId,
  onClose,
}: {
  agent?: Agent;
  workspaceId: string;
  onClose: () => void;
}) {
  const { data: docs } = useDocuments(workspaceId);
  const { data: tools } = useTools(workspaceId);
  const createAgent = useCreateAgent(workspaceId);
  const updateAgent = useUpdateAgent(workspaceId);

  const [form, setForm] = useState<CreateAgentInput>({
    name: agent?.name || '',
    description: agent?.description || '',
    systemPrompt: agent?.systemPrompt || 'You are a helpful AI assistant.',
    model: agent?.model || 'llama-3.3-70b-versatile',
    temperature: 0.7,
    isPublic: false,
    documentIds: agent?.agentKnowledge.map((k) => k.document.id) || [],
    toolIds: agent?.agentTools.map((t) => t.tool.id) || [],
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (agent) {
        const result = await updateAgent.mutateAsync({ id: agent.id, data: form });
        if (!result.success) setError(result.error?.message || 'Update failed');
        else onClose();
      } else {
        const result = await createAgent.mutateAsync(form);
        if (!result.success) setError(result.error?.message || 'Create failed');
        else onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const toggleDoc = (id: string) => {
    setForm((f) => ({
      ...f,
      documentIds: f.documentIds?.includes(id)
        ? f.documentIds.filter((d) => d !== id)
        : [...(f.documentIds || []), id],
    }));
  };

  const toggleTool = (id: string) => {
    setForm((f) => ({
      ...f,
      toolIds: f.toolIds?.includes(id)
        ? f.toolIds.filter((t) => t !== id)
        : [...(f.toolIds || []), id],
    }));
  };

  const isPending = createAgent.isPending || updateAgent.isPending;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{agent ? 'Edit Agent' : 'Create AI Agent'}</DialogTitle>
          <DialogDescription className="text-xs">
            Configure system prompt instructions, model selection, and attached knowledge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto text-left">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Research Assistant"
                required
                className="bg-background border-border h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief summary of agent purpose..."
                className="bg-background border-border h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Model</Label>
              <Select
                value={form.model}
                onValueChange={(val) => val && setForm((f) => ({ ...f, model: val }))}
              >
                <SelectTrigger className="w-full h-9 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Prompt *</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                rows={3}
                required
                className="bg-background border-border rounded-xl text-xs"
                placeholder="Instruct the AI how to act..."
              />
            </div>

            {/* Knowledge Documents Selection */}
            {docs && docs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Attach Knowledge Documents
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {docs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDoc(doc.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                        form.documentIds?.includes(doc.id)
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-muted/30 text-foreground hover:border-primary/40'
                      }`}
                    >
                      <span className="truncate">{doc.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tools Selection */}
            {tools && tools.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Enable Agent Tools
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                        form.toolIds?.includes(tool.id)
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-muted/30 text-foreground hover:border-primary/40'
                      }`}
                    >
                      <span className="truncate">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending} className="rounded-xl">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : agent ? 'Save Agent' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const { data: agents, isLoading } = useAgents(workspaceId);
  const deleteAgent = useDeleteAgent(workspaceId);

  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">AI Agents</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure specialized AI personas with prompt instructions, knowledge bases, and tools.</p>
        </div>
        <Button variant="primary" size="default" className="rounded-xl font-semibold shadow-xs" onClick={() => { setEditAgent(undefined); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          Create Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : agents?.length === 0 ? (
        <Card className="white-panel rounded-2xl border-border">
          <CardContent className="p-12 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-foreground font-semibold text-base">No AI Agents configured yet</p>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">Create specialized AI assistants for research, support, or document search.</p>
            <Button variant="primary" size="sm" className="mt-4 rounded-xl" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Create First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents?.map((agent) => (
            <div key={agent.id} className="p-5 rounded-2xl border border-border/80 bg-background hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm leading-snug">{agent.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{agent.model}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {agent.description || agent.systemPrompt}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1 font-medium"><MessageSquare className="w-3 h-3 text-primary" /> {agent._count.conversations} chats</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium"><BookOpen className="w-3 h-3 text-info" /> {agent.agentKnowledge.length} docs</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium"><Wrench className="w-3 h-3 text-warning" /> {agent.agentTools.length} tools</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <Link href="/dashboard/chat">
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg font-medium">
                    Start Chat
                  </Button>
                </Link>

                <div className="flex items-center gap-1">
                  {deleteConfirm === agent.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-danger font-medium">Delete?</span>
                      <Button size="sm" variant="danger" className="h-7 px-2 text-xs rounded-md" onClick={() => { deleteAgent.mutate(agent.id); setDeleteConfirm(null); }}>Yes</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-md" onClick={() => setDeleteConfirm(null)}>No</Button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setEditAgent(agent); setShowForm(true); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit Agent">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(agent.id)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Delete Agent">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && workspaceId && (
        <AgentFormModal
          agent={editAgent}
          workspaceId={workspaceId}
          onClose={() => { setShowForm(false); setEditAgent(undefined); }}
        />
      )}
    </div>
  );
}
