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
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardOverviewPage() {
  const { user, currentWorkspace } = useAuth();

  const stats = [
    { name: 'Uploaded Documents', value: '4 Files', icon: FileText, change: '+2 this week', color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Active AI Agents', value: '3 Agents', icon: Bot, change: '1 public agent', color: 'text-info', bg: 'bg-info/10' },
    { name: 'RAG Embeddings', value: '1,420 Chunks', icon: Database, change: '100% indexed', color: 'text-warning', bg: 'bg-warning/10' },
    { name: 'AI API Execution', value: '99.8%', icon: Activity, change: '12ms avg latency', color: 'text-success', bg: 'bg-success/10' },
  ];

  const quickActions = [
    {
      title: 'Upload Documents',
      desc: 'Add PDF, DOCX, Markdown, or CSV files to your vector knowledge base.',
      href: '/dashboard/documents',
      icon: FileText,
      badge: 'RAG Enabled',
    },
    {
      title: 'Create AI Agent',
      desc: 'Deploy dynamic agents with custom system prompts & tool capabilities.',
      href: '/dashboard/agents',
      icon: Bot,
      badge: 'Tools & Memory',
    },
    {
      title: 'Start RAG Chat',
      desc: 'Ask questions and stream answers cited directly from your documents.',
      href: '/dashboard/chat',
      icon: MessageSquare,
      badge: 'Live Streaming',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="white-panel p-8 rounded-3xl border-border">
        <CardContent className="p-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Active • {currentWorkspace?.name || 'Personal'}</span>
          </div>

          <h1 className="text-3xl font-bold font-heading text-foreground">
            Welcome back, <span className="text-primary">{user?.name || user?.email.split('@')[0]}</span>
          </h1>

          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            Your workspace is online. Upload documents to generate vector embeddings, configure custom tool-calling agents, or start streaming RAG queries.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/documents">
              <Button variant="primary" size="default">
                <Plus className="w-4 h-4" />
                Add Knowledge Document
              </Button>
            </Link>

            <Link href="/dashboard/chat">
              <Button variant="secondary" size="default">
                <MessageSquare className="w-4 h-4 text-primary" />
                Open AI Chat
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.name} className="white-panel-interactive p-6 rounded-2xl border-border">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-4 text-2xl font-bold text-foreground font-heading">
                  {item.value}
                </div>

                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <span>{item.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Action Tiles */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick Platform Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="group white-panel-interactive p-6 rounded-2xl border-border flex flex-col justify-between h-full">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                        {action.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {action.desc}
                    </p>

                    <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                      <span>Launch Module</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Architecture Integrity & Status */}
      <Card className="white-panel p-6 rounded-2xl border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <CardContent className="p-0 flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">System Architecture Status</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Backend Express 5 API running on port 3001 • Prisma ORM & Authentication Active
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            API Healthy
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
