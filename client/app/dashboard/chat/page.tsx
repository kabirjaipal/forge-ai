'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Pencil,
  Bot,
  User,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Search,
  Copy,
  Check,
  RotateCcw,
  Cpu,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth-context';
import {
  useConversations,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
  useDeleteAllConversations,
  useConversation,
  type Message,
} from '@/lib/hooks/useConversations';
import { useAgents } from '@/lib/hooks/useAgents';
import { useTools } from '@/lib/hooks/useTools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';

function MessageBubble({
  message,
  agentName,
}: {
  message: Message | { id: string; role: string; content: string; createdAt?: string; tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number } };
  agentName?: string;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const tokenUsage = (message as any).tokenUsage || ((message as any).toolCalls as any)?.tokenUsage;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
          isUser
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-primary/10 text-primary border-primary/20'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {isUser ? 'You' : agentName || 'AI Assistant'}
          </span>
          {message.createdAt && (
            <span className="text-[10px] text-muted-foreground/70">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div
          className={`relative px-4 py-3 pr-8 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
              : 'bg-background text-foreground border border-border/80 rounded-tl-xs shadow-xs'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed text-foreground">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1 text-foreground">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1 text-foreground">{children}</ol>,
                  li: ({ children }) => <li className="my-1 text-foreground">{children}</li>,
                  h1: ({ children }) => <h1 className="text-base font-bold text-foreground mt-3 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-bold text-foreground mt-2 mb-1">{children}</h3>,
                  code: ({ inline, className, children, ...props }: any) => {
                    return inline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary border border-border/60" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-muted/70 p-3 rounded-xl font-mono text-xs overflow-x-auto my-2.5 border border-border">
                        <code className="text-foreground" {...props}>{children}</code>
                      </pre>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary/50 pl-3.5 italic text-muted-foreground my-2.5 bg-primary/5 py-1.5 pr-2 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 border border-border rounded-xl">
                      <table className="min-w-full divide-y divide-border text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="bg-muted/60 px-3 py-2 text-left font-semibold text-foreground">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 border-t border-border/40 text-foreground">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {!isUser && tokenUsage && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[10px] font-medium text-muted-foreground">
              <span className="text-primary font-semibold">{tokenUsage.promptTokens} in</span>
              <span>•</span>
              <span className="text-foreground/80">{tokenUsage.completionTokens} out</span>
              <span>•</span>
              <span className="font-semibold text-foreground">{tokenUsage.totalTokens} tokens</span>
            </div>
          )}

          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs ${
              isUser
                ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/60'
            }`}
            title={isUser ? 'Copy prompt' : 'Copy message'}
          >
            {copied ? (
              <Check className={`w-3.5 h-3.5 ${isUser ? 'text-primary-foreground font-bold' : 'text-success'}`} />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const searchParams = useSearchParams();
  const urlAgentId = searchParams.get('agentId');

  const { data: conversations } = useConversations(workspaceId);
  const { data: agents } = useAgents(workspaceId);
  const createConvo = useCreateConversation(workspaceId);
  const updateConvo = useUpdateConversation(workspaceId);
  const deleteConvo = useDeleteConversation(workspaceId);
  const deleteAllConvos = useDeleteAllConversations(workspaceId);
  const queryClient = useQueryClient();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    (Message | { id: string; role: string; content: string; createdAt?: string })[]
  >([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'agents'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const processedAgentIdRef = useRef<string | null>(null);

  // Auto-start chat with agent when URL contains ?agentId=... (guaranteed single execution)
  useEffect(() => {
    if (
      urlAgentId &&
      workspaceId &&
      agents &&
      conversations &&
      processedAgentIdRef.current !== urlAgentId
    ) {
      processedAgentIdRef.current = urlAgentId;
      const targetAgent = agents.find((a) => a.id === urlAgentId);
      if (targetAgent) {
        const existing = conversations.find((c) => c.agentId === urlAgentId);
        if (existing) {
          setActiveConvoId(existing.id);
          router.replace('/dashboard/chat');
        } else {
          createConvo.mutateAsync({
            title: `Chat with ${targetAgent.name}`,
            agentId: urlAgentId,
          }).then((res) => {
            if (res.success && res.data) {
              setActiveConvoId(res.data.id);
            }
            router.replace('/dashboard/chat');
          });
        }
      }
    }
  }, [urlAgentId, workspaceId, agents, conversations, router]);

  const [showToolSuggestions, setShowToolSuggestions] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');

  const { data: activeConvo } = useConversation(workspaceId, activeConvoId || undefined);
  const { data: dbTools = [] } = useTools(workspaceId);

  // Compute available tools dynamically from workspace tools (built-in + custom)
  const availableTools = useMemo(() => {
    const formattedTools = dbTools.map((t) => ({
      tag: `@${t.name}`,
      name: t.name,
      description: t.description,
    }));

    const agentTools = activeConvo?.agent?.agentTools;
    if (agentTools && agentTools.length > 0) {
      const assignedNames = new Set(agentTools.map((at) => at.tool.name));
      return formattedTools.filter((tool) => assignedNames.has(tool.name));
    }
    return formattedTools;
  }, [dbTools, activeConvo?.agent?.agentTools]);

  const filteredToolSuggestions = useMemo(() => {
    if (!toolSearchQuery) return availableTools;
    return availableTools.filter(
      (t) =>
        t.tag.toLowerCase().includes(toolSearchQuery) ||
        t.name.toLowerCase().includes(toolSearchQuery) ||
        t.description.toLowerCase().includes(toolSearchQuery)
    );
  }, [availableTools, toolSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ' || val[lastAt - 1] === '\n')) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setToolSearchQuery(query.toLowerCase());
        setShowToolSuggestions(true);
        return;
      }
    }
    setShowToolSuggestions(false);
  };

  const insertToolTag = (tag: string) => {
    const lastAt = inputText.lastIndexOf('@');
    if (lastAt !== -1) {
      const before = inputText.slice(0, lastAt);
      setInputText(`${before}${tag} `);
    } else {
      setInputText(`${inputText} ${tag} `);
    }
    setShowToolSuggestions(false);
  };


  // Sync messages & context stats from server when convo loads or reloads
  useEffect(() => {
    if (activeConvo?.messages) {
      setLocalMessages(activeConvo.messages);
      const lastAssistantMsg = [...activeConvo.messages]
        .reverse()
        .find((m: any) => m.role === 'assistant' && (m.tokenUsage || m.toolCalls?.tokenUsage));
      const usage = (lastAssistantMsg as any)?.tokenUsage || (lastAssistantMsg as any)?.toolCalls?.tokenUsage;
      if (usage?.totalTokens) {
        const MAX_CONTEXT_TOKENS = 128000;
        setContextStats({
          usedTokens: usage.totalTokens,
          maxTokens: MAX_CONTEXT_TOKENS,
          remainingTokens: MAX_CONTEXT_TOKENS - usage.totalTokens,
          percentage: Number(((usage.totalTokens / MAX_CONTEXT_TOKENS) * 100).toFixed(2)),
        });
      }
    } else {
      setLocalMessages([]);
      setContextStats(null);
    }
  }, [activeConvo?.id, activeConvo?.messages]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamingContent]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter((convo) => {
      const matchesSearch = convo.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || (filterType === 'agents' && convo.agentId);
      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filterType]);

  const handleCreateConvo = async (customTitle?: string, customAgentId?: string) => {
    if (!workspaceId) return;
    const titleToUse = customTitle || 'New Chat';

    const result = await createConvo.mutateAsync({
      title: titleToUse,
      agentId: customAgentId || undefined,
    });
    if (result.success && result.data) {
      setActiveConvoId(result.data.id);
      setLocalMessages([]);
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      updateConvo.mutate({ id, title: editingTitle.trim() });
    }
    setEditingConvoId(null);
  };

  const [activeToolStatus, setActiveToolStatus] = useState<{ toolName: string; message: string; isComplete: boolean } | null>(null);
  const [contextStats, setContextStats] = useState<{ usedTokens: number; maxTokens: number; remainingTokens: number; percentage: number } | null>(null);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isSending || !activeConvoId || !workspaceId) return;

    const userMsg = { id: `local-${Date.now()}`, role: 'user', content: inputText.trim() };
    setLocalMessages((msgs) => [...msgs, userMsg]);
    setInputText('');
    setIsSending(true);
    setStreamingContent('');
    setActiveToolStatus(null);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/conversations/${activeConvoId}/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: userMsg.content }),
        }
      );

      if (!res.ok || !res.body) {
        setError('Failed to get a response from the AI. Please try again.');
        setIsSending(false);
        setStreamingContent(null);
        setActiveToolStatus(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let currentEventType = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!.trim();
          if (!line) continue;

          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());

              if (currentEventType === 'start' && data.contextStats) {
                setContextStats(data.contextStats);
              } else if (currentEventType === 'tool_start') {
                setActiveToolStatus({ toolName: data.toolName, message: data.message, isComplete: false });
              } else if (currentEventType === 'tool_done') {
                setActiveToolStatus({ toolName: data.toolName, message: data.message, isComplete: true });
              } else if (currentEventType === 'chunk') {
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
              }

              if (currentEventType === 'done' || data.messageId) {
                if (data.contextStats) setContextStats(data.contextStats);
                setLocalMessages((msgs) => [
                  ...msgs,
                  {
                    id: data.messageId || `msg-${Date.now()}`,
                    role: 'assistant',
                    content: data.content || accumulated,
                    tokenUsage: data.tokenUsage,
                  },
                ]);
                setStreamingContent(null);
                setActiveToolStatus(null);
                queryClient.invalidateQueries({ queryKey: ['conversation', workspaceId, activeConvoId] });
                queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
              }
            } catch {}
          }
        }
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setStreamingContent(null);
      setActiveToolStatus(null);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, activeConvoId, workspaceId, queryClient]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const displayMessages = localMessages;

  return (
    <div className="flex flex-col md:flex-row h-full w-full min-h-0 overflow-hidden rounded-2xl">
      {/* Sidebar Panel */}
      <aside className="w-full md:w-80 bg-background border-r border-border flex flex-col shrink-0 min-h-0 overflow-hidden">
        {/* Header & New Button */}
        <div className="p-3.5 border-b border-border space-y-3">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="default"
              className="flex-1 justify-center rounded-xl font-semibold shadow-xs"
              onClick={() => handleCreateConvo('New Chat')}
            >
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            {agents && agents.length > 0 && (
              <Select
                value={activeConvo?.agentId || 'none'}
                onValueChange={(val) => {
                  if (val && val !== 'none') {
                    const agent = agents.find((a) => a.id === val);
                    handleCreateConvo(agent ? `Chat with ${agent.name}` : 'New Chat', val);
                  } else if (val === 'none') {
                    handleCreateConvo('New Chat');
                  }
                }}
              >
                <SelectTrigger className="w-28 h-9 rounded-xl bg-background border-border text-xs shrink-0 font-medium">
                  <SelectValue placeholder="Agent 🤖">
                    <span className="flex items-center gap-1.5 truncate">
                      <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Agent</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="none">✨ General AI (No Agent)</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      🤖 {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-8 bg-muted/40 border-border h-9 rounded-xl text-xs"
            />
          </div>

          {/* Filter Tabs & Delete All Button */}
          <div className="flex items-center justify-between gap-2">
            <Tabs value={filterType} onValueChange={(val) => setFilterType(val as 'all' | 'agents')} className="flex-1 min-w-0">
              <TabsList variant="buttonGroup" className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="all">
                  All ({conversations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="agents">
                  Agents Only
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {conversations && conversations.length > 0 && (
              confirmDeleteAll ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      deleteAllConvos.mutate();
                      setActiveConvoId(null);
                      setConfirmDeleteAll(false);
                    }}
                    title="Confirm Delete All Chats"
                    className="h-8 px-2 text-[11px] font-bold rounded-lg"
                  >
                    Clear All
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() => setConfirmDeleteAll(false)}
                    className="h-8 w-6 p-0 rounded-lg"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setConfirmDeleteAll(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg shrink-0"
                  title="Delete all conversations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-2 opacity-60">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-foreground">No chats found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {searchQuery ? 'Try a different search term' : 'Click "+ New Conversation" to start'}
              </p>
            </div>
          ) : (
            filteredConversations.map((convo) => {
              const isActive = activeConvoId === convo.id;
              return (
                <div
                  key={convo.id}
                  onClick={() => setActiveConvoId(convo.id)}
                  className={`group relative w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium shadow-xs'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                  )}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {convo.agent ? <Bot className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </div>
                    {editingConvoId === convo.id ? (
                      <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(convo.id);
                            if (e.key === 'Escape') setEditingConvoId(null);
                          }}
                          className="h-7 text-xs bg-background rounded-lg"
                        />
                        <button
                          onClick={() => handleSaveRename(convo.id)}
                          className="p-1 text-success hover:bg-success/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingConvoId(null)}
                          className="p-1 text-muted-foreground hover:bg-muted rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${isActive ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
                          {convo.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {convo.agent && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium truncate">
                              {convo.agent.name}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {convo._count?.messages || 0} msgs
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {editingConvoId !== convo.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConvoId(convo.id);
                          setEditingTitle(convo.title);
                        }}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Rename chat"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConvo.mutate(convo.id);
                          if (activeConvoId === convo.id) setActiveConvoId(null);
                        }}
                        className="text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0 min-h-0">
        {!activeConvoId ? (
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-xl w-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground font-heading tracking-tight">
                  Welcome to AI Chat Workspace
                </h2>
                <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed max-w-md mx-auto">
                  Engage with intelligent AI agents, stream real-time responses, and leverage your custom knowledge base documents.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  size="default"
                  className="rounded-xl font-semibold shadow-xs px-6"
                  onClick={() => handleCreateConvo('New Chat')}
                >
                  <Plus className="w-4 h-4" /> Start New Conversation
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Top Bar */}
            <div className="px-6 py-3.5 border-b border-border flex items-center justify-between bg-background shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    {activeConvo?.agent ? <Bot className="w-4.5 h-4.5" /> : <MessageSquare className="w-4.5 h-4.5" />}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-background" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {activeConvo && editingConvoId === activeConvo.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(activeConvo.id);
                            if (e.key === 'Escape') setEditingConvoId(null);
                          }}
                          className="h-7 text-xs bg-background rounded-lg font-bold"
                        />
                        <button
                          onClick={() => handleSaveRename(activeConvo.id)}
                          className="p-1 text-success hover:bg-success/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingConvoId(null)}
                          className="p-1 text-muted-foreground hover:bg-muted rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-foreground text-sm tracking-tight">
                          {activeConvo?.title || 'Conversation'}
                        </h3>
                        {activeConvo && (
                          <button
                            onClick={() => {
                              setEditingConvoId(activeConvo.id);
                              setEditingTitle(activeConvo.title);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
                            title="Rename conversation"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                    {activeConvo?.agent && (
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                        {activeConvo.agent.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {activeConvo?.agent ? `Agent: ${activeConvo.agent.name}` : 'General AI Workspace Session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {contextStats && (
                  <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/80 text-xs">
                    <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-semibold">
                        <span className="text-foreground">Context Window</span>
                        <span className="text-primary">{contextStats.percentage}%</span>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(3, contextStats.percentage))}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {contextStats.usedTokens.toLocaleString()} / {contextStats.maxTokens.toLocaleString()}
                    </span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalMessages([])}
                  className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  title="Clear current view"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear View</span>
                </Button>
              </div>
            </div>

            {/* Messages Canvas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {displayMessages.length === 0 && !streamingContent && (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3 opacity-40">
                    <Bot className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Conversation Ready</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Type your query below to prompt {activeConvo?.agent?.name || 'the AI Assistant'}.
                  </p>
                </div>
              )}

              {displayMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  agentName={activeConvo?.agent?.name}
                />
              ))}

              {activeToolStatus && (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit shadow-xs">
                  {activeToolStatus.isComplete ? (
                    <Check className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  )}
                  <span>{activeToolStatus.message}</span>
                </div>
              )}

              {streamingContent !== null && (
                <MessageBubble
                  message={{ id: 'streaming', role: 'assistant', content: streamingContent || 'Thinking...' }}
                  agentName={activeConvo?.agent?.name}
                />
              )}


              {error && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-border bg-background shrink-0 relative">
              {/* @ Tool Autocomplete Suggestion Popup */}
              {showToolSuggestions && filteredToolSuggestions.length > 0 && (
                <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto space-y-1 z-30">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 flex items-center justify-between border-b border-border/50">
                    <span>Mention MCP Tool (@)</span>
                    <span className="text-primary font-mono font-semibold">
                      {activeConvo?.agent ? `${activeConvo.agent.name} Tools (${filteredToolSuggestions.length})` : `All Tools (${filteredToolSuggestions.length})`}
                    </span>
                  </div>
                  {filteredToolSuggestions.map((tool) => (
                    <button
                      key={tool.tag}
                      type="button"
                      onClick={() => insertToolTag(tool.tag)}
                      className="w-full text-left p-2 rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-primary">{tool.tag}</span>
                          <span className="text-xs font-semibold text-foreground">{tool.name}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{tool.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-muted/30 border border-border rounded-2xl p-3 focus-within:border-primary/40 transition-all shadow-xs space-y-2">
                <Textarea
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${activeConvo?.agent?.name || 'AI Assistant'}... Type @ to mention a tool (e.g. @weather_api, @web_search)`}
                  rows={2}
                  className="w-full bg-transparent border-0 p-0 text-sm text-foreground focus-visible:outline-none placeholder:text-muted-foreground/70 resize-none min-h-[48px]"
                />



                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    {activeConvo?.agent ? (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-lg">
                        ⚡ {activeConvo.agent.name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-lg">
                        ⚡ General Chat (All Tools Enabled)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isSending}
                    className="h-8 px-4 rounded-xl font-semibold shadow-xs"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

