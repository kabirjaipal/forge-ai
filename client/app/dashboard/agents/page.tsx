'use client';

import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  MessageSquare,
  BookOpen,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgents, useTools, useCreateAgent, useDeleteAgent, useUpdateAgent, type Agent, type CreateAgentInput } from '@/lib/hooks/useAgents';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
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
    model: agent?.model || 'gpt-4o-mini',
    temperature: agent?.temperature ?? 0.7,
    isPublic: agent?.isPublic ?? false,
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
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'Create AI Agent'}</DialogTitle>
          <DialogDescription>
            Configure prompt instructions, model parameters, knowledge documents, and tools.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-left">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Research Assistant"
                  required
                  className="bg-background border-border h-10 rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  className="bg-background border-border h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Prompt *</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                rows={4}
                required
                className="bg-background border-border rounded-xl"
                placeholder="You are an expert AI assistant that..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</Label>
                <Select
                  value={form.model}
                  onValueChange={(val) => val && setForm((f) => ({ ...f, model: val }))}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border">
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
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Temperature: {form.temperature?.toFixed(1)}
                </Label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                  className="w-full h-2 mt-3 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Knowledge Base */}
            {docs && docs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Knowledge Documents
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
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

            {/* Tools */}
            {tools && tools.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Available Tools
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

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.isPublic}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isPublic: checked }))}
                />
                <span className="text-sm font-medium text-foreground">Make agent public</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="default" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : agent ? 'Save Changes' : 'Create Agent'}
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">AI Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Build specialized agents with custom prompts, knowledge bases, and tool access.</p>
        </div>
        <Button variant="primary" size="default" onClick={() => { setEditAgent(undefined); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          New Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : agents?.length === 0 ? (
        <Card className="white-panel rounded-2xl border-border">
          <CardContent className="p-16 text-center">
            <Bot className="w-14 h-14 text-muted-foreground mx-auto mb-5 opacity-30" />
            <p className="text-foreground font-semibold text-lg">No agents yet</p>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Create your first AI agent with a custom system prompt, knowledge base, and tool set.</p>
            <Button variant="primary" size="default" className="mt-6" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {agents?.map((agent) => (
            <Card key={agent.id} className="white-panel-interactive border-border rounded-2xl flex flex-col">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">{agent.model}</p>
                    </div>
                  </div>
                  {agent.isPublic && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">Public</span>
                  )}
                </div>

                {agent.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{agent._count.conversations} chats</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{agent.agentKnowledge.length} docs</span>
                  <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />{agent.agentTools.length} tools</span>
                </div>

                {expandedId === agent.id && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">System Prompt</p>
                    <p className="text-xs text-foreground line-clamp-4">{agent.systemPrompt}</p>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                  <button
                    onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {expandedId === agent.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expandedId === agent.id ? 'Hide' : 'Details'}
                  </button>
                  <div className="flex items-center gap-2">
                    {deleteConfirm === agent.id ? (
                      <>
                        <span className="text-xs text-danger">Delete?</span>
                        <Button size="sm" variant="danger" className="h-7 px-2 text-xs" onClick={() => { deleteAgent.mutate(agent.id); setDeleteConfirm(null); }}>Yes</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteConfirm(null)}>No</Button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setDeleteConfirm(agent.id)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditAgent(agent); setShowForm(true); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
