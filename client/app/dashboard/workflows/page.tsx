'use client';

import React from 'react';
import { Cpu, Plus, Play, Sparkles, Layers, ArrowRight, Zap, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function WorkflowsPage() {
  const workflows = [
    {
      id: 'wf-1',
      name: 'Document Ingestion & RAG Indexing',
      description: 'Automatically process uploaded PDFs, split text into chunks, generate OpenAI embeddings, and store in pgvector.',
      trigger: 'On File Upload',
      status: 'active',
      runs: 142,
      lastRun: '10 mins ago',
    },
    {
      id: 'wf-2',
      name: 'AI Agent Auto-Summarizer',
      description: 'Summarize long conversation threads and append key takeaways to agent persistent memory context.',
      trigger: 'On Conversation End',
      status: 'active',
      runs: 89,
      lastRun: '1 hour ago',
    },
    {
      id: 'wf-3',
      name: 'Scheduled Knowledge Base Sync',
      description: 'Re-index stale documents and sync latest database embeddings on a cron schedule.',
      trigger: 'Daily at 00:00 UTC',
      status: 'paused',
      runs: 28,
      lastRun: '1 day ago',
    },
  ];

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Automated Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and trigger automated AI pipelines, document pipelines, and agent multi-step actions.
          </p>
        </div>
        <Button variant="primary" size="default">
          <Plus className="w-4 h-4" />
          Create Workflow
        </Button>
      </div>

      {/* Workflow Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
        <Card className="white-panel border-border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Workflows</p>
              <p className="text-2xl font-bold text-foreground font-heading mt-0.5">2 Pipelines</p>
            </div>
          </CardContent>
        </Card>

        <Card className="white-panel border-border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Executions</p>
              <p className="text-2xl font-bold text-foreground font-heading mt-0.5">259 Runs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="white-panel border-border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Latency</p>
              <p className="text-2xl font-bold text-foreground font-heading mt-0.5">180ms</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4 w-full">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Configured Workflows ({workflows.length})
        </h2>

        <div className="space-y-3 w-full">
          {workflows.map((wf) => (
            <Card key={wf.id} className="white-panel border-border rounded-2xl hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-foreground">{wf.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            wf.status === 'active'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {wf.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{wf.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-primary" /> Trigger: {wf.trigger}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Last Run: {wf.lastRun}
                        </span>
                        <span>•</span>
                        <span>{wf.runs} total runs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button variant="outline" size="sm">
                      <Play className="w-3.5 h-3.5" />
                      Run Now
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
