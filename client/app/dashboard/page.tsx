'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Bot,
  MessageSquare,
  Zap,
  ArrowUpRight,
  Database,
  Activity,
  Sparkles,
  Plus,
  ShieldCheck,
  Clock,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useAgents } from '@/lib/hooks/useAgents';
import { useConversations } from '@/lib/hooks/useConversations';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { Button } from '@/components/ui/button';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardOverviewPage() {
  const { user, currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;

  const { data: documents, isLoading: loadingDocs } = useDocuments(workspaceId);
  const { data: agents, isLoading: loadingAgents } = useAgents(workspaceId);
  const { data: conversations, isLoading: loadingConvos } = useConversations(workspaceId);
  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics(workspaceId);

  const docCount = documents?.length ?? 0;
  const agentCount = agents?.length ?? 0;
  const convoCount = conversations?.length ?? 0;
  const chunkCount = analytics?.totalChunks ?? 0;
  const tokenUsage = analytics?.estimatedTokenUsage ?? 0;

  const recentDocs = documents?.slice(0, 4) ?? [];
  const recentAgents = agents?.slice(0, 4) ?? [];
  const recentConvos = conversations?.slice(0, 4) ?? [];

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace: {currentWorkspace?.name || 'Personal Workspace'}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
            Welcome back, <span className="text-primary">{user?.name || user?.email.split('@')[0]}</span>
          </h1>

          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl leading-relaxed">
            Your AI Workspace is live. Query knowledge base documents, chat with custom agents, and stream RAG answers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard/documents">
            <Button variant="primary" size="default" className="rounded-xl font-semibold shadow-xs">
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          </Link>

          <Link href="/dashboard/chat">
            <Button variant="outline" size="default" className="rounded-xl font-semibold">
              <MessageSquare className="w-4 h-4 text-primary" />
              Start Chat
            </Button>
          </Link>
        </div>
      </div>

      {/* Minimalist Live Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Knowledge Base</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            {loadingDocs ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-foreground font-heading">{docCount}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">Uploaded documents</p>
          </div>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Agents</span>
            <Bot className="w-4 h-4 text-info" />
          </div>
          <div className="mt-3">
            {loadingAgents ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-foreground font-heading">{agentCount}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">Active agent personas</p>
          </div>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vector Chunks</span>
            <Database className="w-4 h-4 text-warning" />
          </div>
          <div className="mt-3">
            {loadingAnalytics ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-foreground font-heading">{chunkCount.toLocaleString()}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">pgvector embeddings</p>
          </div>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-muted/20 border border-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Sessions</span>
            <Activity className="w-4 h-4 text-success" />
          </div>
          <div className="mt-3">
            {loadingConvos ? (
              <div className="h-7 w-12 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-foreground font-heading">{convoCount}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">{tokenUsage > 0 ? `~${tokenUsage.toLocaleString()} tokens` : 'Active conversations'}</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: Documents & Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Knowledge Base Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Knowledge Base Files ({docCount})</h2>
            </div>
            <Link href="/dashboard/documents" className="text-xs font-semibold text-primary hover:underline flex items-center">
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingDocs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-muted/10">
              <FileCheck className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-foreground">No documents uploaded yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Upload PDF, DOCX, Markdown, or CSV files to enable RAG answers.</p>
              <Link href="/dashboard/documents">
                <Button variant="primary" size="sm" className="rounded-xl text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-background flex items-center justify-between hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0">
                      {doc.fileType || 'doc'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>•</span>
                        <span className="text-success font-medium capitalize">{doc.status}</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/dashboard/chat">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg">
                      Query File
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Agents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-info" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">AI Agents ({agentCount})</h2>
            </div>
            <Link href="/dashboard/agents" className="text-xs font-semibold text-info hover:underline flex items-center">
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingAgents ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : recentAgents.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-muted/10">
              <Bot className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-foreground">No agents created yet</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Create custom AI agents with custom system prompts & tools.</p>
              <Link href="/dashboard/agents">
                <Button variant="primary" size="sm" className="rounded-xl text-xs">
                  <Plus className="w-3.5 h-3.5" /> Create Agent
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-background flex items-center justify-between hover:border-info/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center font-bold text-xs shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{agent.name}</p>
                        <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {agent.model || 'gpt-4o-mini'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {agent.description || agent.systemPrompt}
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/chat">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg">
                      Chat
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent AI Conversations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-success" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent AI Conversations</h2>
          </div>
          <Link href="/dashboard/chat" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Open Chat Workspace <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingConvos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : recentConvos.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-muted/10">
            <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-1 opacity-30" />
            <p className="text-xs font-semibold text-foreground">No recent chat sessions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Start your first conversation to query documents or ask AI agents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentConvos.map((convo) => (
              <Link key={convo.id} href="/dashboard/chat">
                <div className="p-3.5 rounded-xl border border-border/70 bg-background hover:border-primary/40 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {convo.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {convo.agent && <span className="font-medium text-primary">Agent: {convo.agent.name}</span>}
                        <span>•</span>
                        <span>{convo._count?.messages || 0} msgs</span>
                        <span>•</span>
                        <span>{formatDate(convo.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
