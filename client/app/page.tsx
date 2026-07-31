'use client';

import Link from 'next/link';
import { 
  Bot, 
  FileText, 
  Zap, 
  Cpu, 
  Database, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight font-heading text-foreground">
              Forge<span className="text-primary">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#agents" className="hover:text-foreground transition-colors">AI Agents</a>
          </nav>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-20 h-9 rounded-lg bg-muted animate-pulse" />
            ) : user ? (
              <Link href="/dashboard">
                <Button variant="primary" size="default">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="default">
                    Get Started
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation AI Workspace for Enterprise & Teams</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight font-heading text-foreground">
          AI Workspace for <span className="text-primary">Documents, Agents</span> & Automation
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload documents, query custom knowledge bases with instant RAG, and create tool-empowered AI agents — all in one unified platform.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base">
              Launch AI Workspace
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <a href="#features" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base">
              Explore Platform Features
            </Button>
          </a>
        </div>

        {/* Feature Grid Banner */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <Card className="white-panel-interactive p-8 rounded-2xl border-border">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Smart Document RAG</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload PDF, DOCX, Markdown, and CSV files. Automatic chunking, pgvector embeddings, and instant semantic search.
              </p>
            </CardContent>
          </Card>

          <Card className="white-panel-interactive p-8 rounded-2xl border-border">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center text-info mb-6">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Custom AI Agents</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Build specialized agents with tailored system prompts, specific knowledge bases, and multi-tool capabilities.
              </p>
            </CardContent>
          </Card>

          <Card className="white-panel-interactive p-8 rounded-2xl border-border">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Dynamic Tool Calling</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Empower agents to perform real actions — document searches, database queries, web scraping, and external API calls.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platform Capabilities Detail */}
      <section id="features" className="py-20 px-6 border-t border-border bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-foreground">
              Everything You Need in <span className="text-primary">One Application</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Replace fragmented tools with an end-to-end intelligent agent ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Streaming Multi-Model Conversations</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Real-time response streaming with complete citation mapping back to original source files and chunk positions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0 mt-1">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Multi-Tenant Workspaces</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Organize your documents, team members, agents, and API usage across isolated workspace environments.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success shrink-0 mt-1">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Enterprise Production Stack</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Built with Express 5, PostgreSQL + pgvector, Prisma ORM, Redis BullMQ, and Next.js 16 for maximum performance.
                  </p>
                </div>
              </div>
            </div>

            <Card className="white-panel p-8 rounded-3xl border-border shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 pb-6 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-xs text-muted-foreground font-mono ml-2">forgeai-agent-console</span>
                </div>
                <div className="py-6 space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span>Agent initialized: Research Assistant</span>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-foreground text-xs leading-relaxed border border-border">
                    &gt; Query: "Summarize Q3 Financial Report & list key risk factors"
                  </div>
                  <div className="flex items-center gap-2 text-success text-xs">
                    <Database className="w-3.5 h-3.5" />
                    <span>Retrieved 4 chunks from q3_report.pdf (similarity: 0.92)</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-primary text-xs">
                    Executing tool: <span className="font-bold">search_documents</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} ForgeAI. Built for High-Performance AI Applications.</p>
      </footer>
    </div>
  );
}
