'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Search,
  Code2,
  BookOpen,
  Zap,
  BarChart3,
  Copy,
  Check,
  RotateCcw,
  ArrowUpRight,
  Cpu,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth-context';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useConversation,
  type Message,
} from '@/lib/hooks/useConversations';
import { useAgents } from '@/lib/hooks/useAgents';
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

const QUICK_STARTERS = [
  {
    icon: Code2,
    title: 'Code Refactoring',
    prompt: 'Review my codebase architecture and suggest clean optimizations.',
    badge: 'Code AI',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Query',
    prompt: 'Summarize key findings from the uploaded workspace documents.',
    badge: 'RAG Search',
  },
  {
    icon: Zap,
    title: 'Multi-Tool Search',
    prompt: 'Query live web data, weather info, and database metrics using agent tools.',
    badge: 'Tools',
  },
  {
    icon: BarChart3,
    title: 'Analytics Insights',
    prompt: 'Analyze workspace performance metrics and document trends.',
    badge: 'Analytics',
  },
];

const ALL_TOOLS = [
  { tag: '@web_search', name: 'Web Search', description: 'Live Search Engine', icon: '🌐' },
  { tag: '@weather_api', name: 'Weather API', description: 'Real-time Live Weather & Forecast', icon: '☀️' },
];


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
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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

          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 p-1 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;

  const { data: conversations } = useConversations(workspaceId);
  const { data: agents } = useAgents(workspaceId);
  const createConvo = useCreateConversation(workspaceId);
  const deleteConvo = useDeleteConversation(workspaceId);
  const queryClient = useQueryClient();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<
    (Message | { id: string; role: string; content: string; createdAt?: string })[]
  >([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'agents'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showToolSuggestions, setShowToolSuggestions] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');

  const { data: activeConvo } = useConversation(workspaceId, activeConvoId || undefined);

  // Compute available tools: if agent is selected with specific tools, show those; if no agent, show ALL tools
  const availableTools = useMemo(() => {
    const agentTools = activeConvo?.agent?.agentTools;
    if (agentTools && agentTools.length > 0) {
      const assignedNames = new Set(agentTools.map((at) => at.tool.name));
      return ALL_TOOLS.filter((tool) => {
        if (tool.tag === '@weather_api' && assignedNames.has('weather_api')) return true;
        if (tool.tag === '@web_search' && assignedNames.has('web_search')) return true;
        return false;
      });
    }
    return ALL_TOOLS;
  }, [activeConvo?.agent?.agentTools]);

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
    const titleToUse = customTitle || newTitle.trim();
    if (!titleToUse || !workspaceId) return;

    const result = await createConvo.mutateAsync({
      title: titleToUse,
      agentId: customAgentId || selectedAgentId || undefined,
    });
    if (result.success && result.data) {
      setActiveConvoId(result.data.id);
      setLocalMessages([]);
    }
    setNewTitle('');
    setSelectedAgentId('');
    setShowNewConvo(false);
  };

  const handleQuickStarter = (starter: (typeof QUICK_STARTERS)[0]) => {
    const agentToUse = agents && agents.length > 0 ? agents[0].id : undefined;
    handleCreateConvo(starter.title, agentToUse);
    setInputText(starter.prompt);
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
          <Button
            variant="primary"
            size="default"
            className="w-full justify-center rounded-xl font-semibold shadow-xs"
            onClick={() => setShowNewConvo(true)}
          >
            <Plus className="w-4 h-4" /> New Conversation
          </Button>

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

          {/* Filter Tabs using Official Shadcn UI Component with Bootstrap Button Group style */}
          <Tabs value={filterType} onValueChange={(val) => setFilterType(val as 'all' | 'agents')} className="w-full">
            <TabsList variant="buttonGroup" className="w-full grid grid-cols-2 h-8">
              <TabsTrigger value="all">
                All ({conversations?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="agents">
                Agents Only
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* New Conversation Form */}
        {showNewConvo && (
          <div className="p-4 border-b border-border bg-muted/30 space-y-3">
            <Input
              autoFocus
              placeholder="Conversation title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateConvo()}
              className="bg-background border-border h-9 rounded-xl text-xs"
            />
            {agents && agents.length > 0 && (
              <Select
                value={selectedAgentId || 'none'}
                onValueChange={(val) => setSelectedAgentId(val && val !== 'none' ? val : '')}
              >
                <SelectTrigger className="w-full h-9 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Select agent (optional)">
                    {agents.find((a) => a.id === selectedAgentId)?.name ||
                      (selectedAgentId === 'none' ? 'No agent (general chat)' : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No agent (general chat)</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                className="flex-1 rounded-xl"
                onClick={() => handleCreateConvo()}
                disabled={!newTitle.trim() || createConvo.isPending}
              >
                {createConvo.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowNewConvo(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

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
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConvo.mutate(convo.id);
                      if (activeConvoId === convo.id) setActiveConvoId(null);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {QUICK_STARTERS.map((starter, i) => {
                  const IconComp = starter.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuickStarter(starter)}
                      className="p-4 rounded-2xl border border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30 transition-all text-left group cursor-pointer shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {starter.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {starter.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-normal">
                          {starter.prompt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-primary font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-all">
                        <span>Start Chat</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="default"
                  className="rounded-xl font-semibold shadow-xs"
                  onClick={() => setShowNewConvo(true)}
                >
                  <Plus className="w-4 h-4" /> Start Custom Conversation
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
                    <h3 className="font-bold text-foreground text-sm tracking-tight">
                      {activeConvo?.title || 'Conversation'}
                    </h3>
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
                      <span className="text-base">{tool.icon}</span>
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

