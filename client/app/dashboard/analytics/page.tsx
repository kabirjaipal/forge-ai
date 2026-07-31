'use client';
import { FileText, Bot, MessageSquare, Activity, Clock, Zap, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AnalyticsPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const { data: analytics, isLoading } = useAnalytics(workspaceId);

  const stats = [
    {
      name: 'Documents',
      value: analytics?.totalDocuments ?? 0,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
      href: '/dashboard/documents',
    },
    {
      name: 'AI Agents',
      value: analytics?.totalAgents ?? 0,
      icon: Bot,
      color: 'text-info',
      bg: 'bg-info/10',
      href: '/dashboard/agents',
    },
    {
      name: 'Conversations',
      value: analytics?.totalConversations ?? 0,
      icon: MessageSquare,
      color: 'text-warning',
      bg: 'bg-warning/10',
      href: '/dashboard/chat',
    },
    {
      name: 'Messages Sent',
      value: analytics?.totalMessages ?? 0,
      icon: Activity,
      color: 'text-success',
      bg: 'bg-success/10',
      href: '/dashboard/chat',
    },
  ];

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time usage metrics and AI consumption for your workspace.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.name} href={stat.href}>
              <Card className="white-panel-interactive border-border rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{stat.name}</span>
                    <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <p className="text-3xl font-bold text-foreground font-heading">{stat.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className="white-panel border-border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated AI Token Usage</p>
              <p className="text-2xl font-bold text-foreground font-heading mt-0.5">
                {isLoading ? '...' : `${(analytics?.estimatedTokenUsage ?? 0).toLocaleString()} Tokens`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="white-panel border-border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vector Chunks Indexed</p>
              <p className="text-2xl font-bold text-foreground font-heading mt-0.5">
                {isLoading ? '...' : `${analytics?.totalChunks ?? 0} Chunks`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent Activity
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
          <Card className="white-panel rounded-2xl border-border">
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">No activity recorded yet. Upload documents or start a chat.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {analytics.recentActivity.map((item) => (
              <Card key={item.id} className="white-panel border-border rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
