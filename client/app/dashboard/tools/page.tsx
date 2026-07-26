'use client';

import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  Search, 
  Play, 
  Trash2, 
  Edit3, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Wrench,
  Copy,
  Check,
  Code2,
  List
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { 
  useTools, 
  useCreateTool, 
  useUpdateTool, 
  useDeleteTool, 
  useTestTool, 
  MCPTool 
} from '@/lib/hooks/useTools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function MCPToolsPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;

  const { data: tools = [], isLoading } = useTools(workspaceId);
  const createToolMutation = useCreateTool(workspaceId);
  const updateToolMutation = useUpdateTool(workspaceId);
  const deleteToolMutation = useDeleteTool(workspaceId);
  const testToolMutation = useTestTool(workspaceId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<MCPTool | null>(null);
  const [testingTool, setTestingTool] = useState<MCPTool | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'POST' | 'GET'>('POST');
  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  const [schemaText, setSchemaText] = useState('{\n  "type": "object",\n  "properties": {\n    "query": {\n      "type": "string",\n      "description": "Input search query or parameters"\n    }\n  },\n  "required": ["query"]\n}');
  const [formError, setFormError] = useState('');

  // Test Tool State
  const [testArgsText, setTestArgsText] = useState('{\n  "query": "San Francisco"\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [outputViewMode, setOutputViewMode] = useState<'visual' | 'json'>('visual');
  const [copiedResult, setCopiedResult] = useState(false);

  const filteredTools = tools.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'system') return matchesSearch && !t.isCustom;
    if (filterType === 'custom') return matchesSearch && t.isCustom;
    return matchesSearch;
  });

  const handleOpenCreate = () => {
    setEditingTool(null);
    setName('');
    setDescription('');
    setUrl('');
    setMethod('POST');
    setHeadersText('{\n  "Content-Type": "application/json"\n}');
    setSchemaText('{\n  "type": "object",\n  "properties": {\n    "query": {\n      "type": "string",\n      "description": "Input search query or parameters"\n    }\n  },\n  "required": ["query"]\n}');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (tool: MCPTool) => {
    setEditingTool(tool);
    setName(tool.name);
    setDescription(tool.description);
    setUrl(tool.url || '');
    setMethod((tool.method as 'POST' | 'GET') || 'POST');
    setHeadersText(tool.headers ? JSON.stringify(tool.headers, null, 2) : '{\n  "Content-Type": "application/json"\n}');
    setSchemaText(tool.schema ? JSON.stringify(tool.schema, null, 2) : '{\n  "type": "object",\n  "properties": {}\n}');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenTest = (tool: MCPTool) => {
    setTestingTool(tool);
    setTestResult(null);
    setCopiedResult(false);

    // Create sample JSON arguments based on schema properties
    let sampleArgs: Record<string, any> = {};
    if (tool.schema && tool.schema.properties && Object.keys(tool.schema.properties).length > 0) {
      Object.keys(tool.schema.properties).forEach((key) => {
        if (key === 'query' || key === 'q') sampleArgs[key] = 'search term';
        else if (key === 'location' || key === 'city') sampleArgs[key] = 'London';
        else sampleArgs[key] = 'sample_value';
      });
    } else {
      sampleArgs = {};
    }
    setTestArgsText(JSON.stringify(sampleArgs, null, 2));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !description.trim()) {
      setFormError('Tool name and description are required.');
      return;
    }

    if (!url.trim()) {
      setFormError('Target HTTP URL endpoint is required for custom tools.');
      return;
    }

    let parsedHeaders = null;
    if (headersText.trim()) {
      try {
        parsedHeaders = JSON.parse(headersText);
      } catch {
        setFormError('Headers must be valid JSON format.');
        return;
      }
    }

    let parsedSchema = null;
    if (schemaText.trim()) {
      try {
        parsedSchema = JSON.parse(schemaText);
      } catch {
        setFormError('Schema must be valid JSON Schema format.');
        return;
      }
    }

    try {
      if (editingTool) {
        await updateToolMutation.mutateAsync({
          id: editingTool.id,
          data: {
            name: name.trim(),
            description: description.trim(),
            url: url.trim(),
            method,
            headers: parsedHeaders,
            schema: parsedSchema,
          },
        });
      } else {
        await createToolMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          url: url.trim(),
          method,
          headers: parsedHeaders,
          schema: parsedSchema,
        });
      }
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save tool. Please check server logs.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this custom MCP tool?')) {
      await deleteToolMutation.mutateAsync(id);
    }
  };

  const handleRunTest = async () => {
    if (!testingTool) return;
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(testArgsText);
    } catch {
      alert('Test arguments must be valid JSON.');
      return;
    }

    try {
      const res = await testToolMutation.mutateAsync({
        id: testingTool.id,
        args: parsedArgs,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ isError: true, content: [{ type: 'text', text: err?.message || 'Execution failed' }] });
    }
  };

  // Helper to extract clean parsed data from raw MCP response
  const getParsedOutput = () => {
    if (!testResult) return null;
    const isError = Boolean(testResult.isError);

    let parsedPayload: any = testResult;

    if (testResult.content && Array.isArray(testResult.content) && testResult.content[0]?.text) {
      const rawText = testResult.content[0].text;
      try {
        parsedPayload = JSON.parse(rawText);
      } catch {
        parsedPayload = rawText;
      }
    } else if (testResult.result && testResult.result.content && testResult.result.content[0]?.text) {
      const rawText = testResult.result.content[0].text;
      try {
        parsedPayload = JSON.parse(rawText);
      } catch {
        parsedPayload = rawText;
      }
    }

    return { isError, payload: parsedPayload };
  };

  const outputInfo = getParsedOutput();

  const handleCopyJson = () => {
    if (!outputInfo?.payload) return;
    const formatted = typeof outputInfo.payload === 'object'
      ? JSON.stringify(outputInfo.payload, null, 2)
      : String(outputInfo.payload);
    navigator.clipboard.writeText(formatted);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  return (
    <div className="h-full bg-background rounded-2xl border border-border flex flex-col overflow-hidden shadow-xs">
      {/* Page Header */}
      <header className="px-6 py-5 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-foreground tracking-tight flex items-center gap-2">
                MCP Tools Registry
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  Protocol Engine
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage built-in tools and add custom HTTP REST API endpoints to extend AI capability.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="default"
          onClick={handleOpenCreate}
          className="gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Custom MCP Tool
        </Button>
      </header>

      {/* Control Bar: Search & Filters */}
      <div className="px-6 py-3.5 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools by name or description..."
            className="pl-9 bg-background border-border h-9 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background text-muted-foreground border border-border hover:bg-muted/50'
            }`}
          >
            All Tools ({tools.length})
          </button>
          <button
            onClick={() => setFilterType('system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'system'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background text-muted-foreground border border-border hover:bg-muted/50'
            }`}
          >
            System Built-in ({tools.filter((t) => !t.isCustom).length})
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'custom'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background text-muted-foreground border border-border hover:bg-muted/50'
            }`}
          >
            Custom User Tools ({tools.filter((t) => t.isCustom).length})
          </button>
        </div>
      </div>

      {/* Tool Cards Grid Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Loading MCP Tools...</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="h-64 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center bg-muted/10">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-heading">No Tools Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {searchQuery
                ? `No tools match your search query "${searchQuery}".`
                : 'You have not added any custom MCP tools yet.'}
            </p>
            {!searchQuery && (
              <Button variant="outline" size="sm" onClick={handleOpenCreate} className="gap-2">
                <Plus className="w-3.5 h-3.5" />
                Create First Custom Tool
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="bg-background border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                          tool.isCustom
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted text-foreground border-border'
                        }`}
                      >
                        {tool.isCustom ? <Globe className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground font-heading group-hover:text-primary transition-colors flex items-center gap-1.5">
                          @{tool.name}
                        </h3>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {tool.isCustom ? tool.method || 'POST' : 'Native Function'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        tool.isCustom
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}
                    >
                      {tool.isCustom ? 'Custom' : 'System'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>

                  {tool.url && (
                    <div className="pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono truncate bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/60">
                        <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{tool.url}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenTest(tool)}
                    className="h-8 text-xs gap-1.5 font-medium border-border/80 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                  >
                    <Play className="w-3 h-3 text-primary fill-primary" />
                    Test Execution
                  </Button>

                  {tool.isCustom && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(tool)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tool.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Custom Tool Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Edit Custom MCP Tool' : 'Add Custom MCP Tool'}
            </DialogTitle>
            <DialogDescription>
              Define a new Model Context Protocol tool connecting to your external API or webhook endpoint.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="flex flex-col">
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto text-left">
              {formError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2 font-medium">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Tool Identifier Name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. github_issues_search"
                    className="bg-background border-border h-9 text-xs rounded-xl font-mono"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Mentioned in chat as <code className="text-primary font-bold">@{name || 'tool_name'}</code>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    HTTP Method <span className="text-danger">*</span>
                  </Label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'POST' | 'GET')}
                    className="w-full bg-background border border-border h-9 text-xs rounded-xl px-3 font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="POST">POST (JSON Body)</option>
                    <option value="GET">GET (Query Parameters)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Description <span className="text-danger">*</span>
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what information or action this tool provides..."
                  className="bg-background border-border h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Target Endpoint URL <span className="text-danger">*</span>
                </Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/mcp-tool-endpoint"
                  className="bg-background border-border h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Request Headers (JSON)
                </Label>
                <Textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  rows={3}
                  className="bg-muted/20 border-border font-mono text-xs rounded-xl"
                  placeholder='{\n  "Authorization": "Bearer token"\n}'
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Input JSON Schema Definition
                </Label>
                <Textarea
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  rows={5}
                  className="bg-muted/20 border-border font-mono text-xs rounded-xl"
                  placeholder='{\n  "type": "object",\n  "properties": {}\n}'
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={createToolMutation.isPending || updateToolMutation.isPending}
                className="gap-2"
              >
                {(createToolMutation.isPending || updateToolMutation.isPending) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {editingTool ? 'Save Changes' : 'Create Tool'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Execution Modal */}
      <Dialog open={!!testingTool} onOpenChange={() => setTestingTool(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Test Tool: @{testingTool?.name}
            </DialogTitle>
            <DialogDescription>
              Provide test input arguments to execute tool call live through the MCP Protocol Engine.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto text-left">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Input Arguments (JSON)
                </Label>
                {(!testingTool?.schema?.properties || Object.keys(testingTool.schema.properties).length === 0) && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    No parameters required (sending <code className="text-primary font-bold">{}</code>)
                  </span>
                )}
              </div>
              <Textarea
                value={testArgsText}
                onChange={(e) => setTestArgsText(e.target.value)}
                rows={4}
                className="bg-muted/20 border-border font-mono text-xs rounded-xl"
              />
            </div>

            <Button
              variant="primary"
              size="default"
              onClick={handleRunTest}
              disabled={testToolMutation.isPending}
              className="w-full gap-2 font-semibold shadow-xs"
            >
              {testToolMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing Tool Call...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Test Call
                </>
              )}
            </Button>

            {/* Test Results Section */}
            {outputInfo && outputInfo.payload && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {outputInfo.isError ? (
                      <span className="px-2.5 py-1 rounded-lg bg-danger/10 text-danger text-xs font-semibold border border-danger/20 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Execution Failed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-success/10 text-success text-xs font-semibold border border-success/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Execution Succeeded
                      </span>
                    )}
                  </div>

                  {/* Format View Toggle */}
                  <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                    <button
                      onClick={() => setOutputViewMode('visual')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        outputViewMode === 'visual'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="w-3 h-3" /> Formatted
                    </button>
                    <button
                      onClick={() => setOutputViewMode('json')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        outputViewMode === 'json'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Code2 className="w-3 h-3" /> Clean JSON
                    </button>
                    <button
                      onClick={handleCopyJson}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                      title="Copy Output"
                    >
                      {copiedResult ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Visual Search Results Card View */}
                {outputViewMode === 'visual' && outputInfo.payload?.searchResults ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Live Query: &quot;{outputInfo.payload.query}&quot;</span>
                      <span>{outputInfo.payload.searchResultsCount} Results</span>
                    </div>
                    {outputInfo.payload.searchResults.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/20 border border-border rounded-xl space-y-1 hover:border-primary/30 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            {item.title}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-[11px] line-clamp-2">
                          {item.snippet}
                        </p>
                        <span className="text-[10px] text-muted-foreground/80 font-mono block truncate">
                          {item.link}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Clean Pretty-printed JSON View without raw escape characters */
                  <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 text-slate-100 p-4 font-mono text-xs max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                    <pre className="whitespace-pre-wrap">
                      {typeof outputInfo.payload === 'object'
                        ? JSON.stringify(outputInfo.payload, null, 2)
                        : String(outputInfo.payload)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTestingTool(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
