'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Zap, 
  LayoutDashboard, 
  FileText, 
  Bot, 
  MessageSquare, 
  Cpu, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Layers,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { CreateWorkspaceDialog } from '@/components/common/create-workspace-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, currentWorkspace, workspaces, logout, isLoading, setCurrentWorkspace, refreshWorkspaces } = useAuth();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center animate-bounce shadow-md">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // No workspace yet — show a create-workspace prompt
  if (!isLoading && user && workspaces.length === 0) {
    const handleCreateWorkspace = async () => {
      if (!newWsName.trim()) return;
      setCreatingWorkspace(true);
      const slug = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      const res = await api.post<{ id: string; name: string; slug: string }>('/workspaces', {
        name: newWsName.trim(),
        slug,
      });
      if (res.success && res.data) {
        await refreshWorkspaces();
      }
      setCreatingWorkspace(false);
    };

    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-background border border-border rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">Create Your First Workspace</h2>
          <p className="text-muted-foreground text-sm mt-2 mb-6">
            A workspace is where your documents, agents, and conversations live.
          </p>
          <div className="space-y-3 text-left">
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              placeholder={`${user.name || user.email.split('@')[0]}'s Workspace`}
              autoFocus
              className="bg-background border-border h-10 rounded-xl"
            />
            <Button
              variant="primary"
              size="default"
              className="w-full"
              onClick={handleCreateWorkspace}
              disabled={creatingWorkspace || !newWsName.trim()}
            >
              {creatingWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Knowledge Base', href: '/dashboard/documents', icon: FileText },
    { name: 'AI Agents', href: '/dashboard/agents', icon: Bot },
    { name: 'MCP Tools', href: '/dashboard/tools', icon: Cpu },
    { name: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="h-screen bg-muted/30 text-foreground flex p-3 md:p-4 gap-3 md:gap-4 overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-background border border-border rounded-2xl flex flex-col justify-between shrink-0 shadow-sm overflow-hidden select-none">
        <div className="flex flex-col gap-1">
          {/* Brand Header */}
          <div className="p-4 border-b border-border/80 flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight font-heading text-foreground">
                Forge<span className="text-primary">AI</span>
              </span>
            </Link>
          </div>

          {/* Workspace Switcher */}
          <div className="px-3 pt-3 pb-2 relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between text-left transition-all duration-200 ${
                isWorkspaceMenuOpen
                  ? 'border-primary/40 bg-primary/5 shadow-xs'
                  : 'border-border/80 bg-muted/30 hover:border-primary/30 hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs border border-primary/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-foreground truncate leading-snug">
                    {currentWorkspace?.name || "Personal Workspace"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium capitalize leading-none mt-0.5">
                    {currentWorkspace?.role || "Owner"}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  isWorkspaceMenuOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>

            {/* Workspace Dropdown */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-3 right-3 top-16 z-50 bg-background border border-border rounded-xl p-1.5 shadow-xl space-y-1 backdrop-blur-md">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2.5 py-1">
                  Workspaces
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspace(ws);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentWorkspace?.id === ws.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground hover:bg-muted font-medium'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {currentWorkspace?.id === ws.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-1 border-t border-border/80">
                  <button
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setShowCreateWsModal(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-border/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs border border-primary/20">
                {user.name ? user.name[0] : user.email[0]}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-foreground truncate leading-snug">
                  {user.name || user.email.split('@')[0]}
                </div>
                <div className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main className="flex-1 bg-background border border-border rounded-2xl flex flex-col min-w-0 min-h-0 overflow-hidden shadow-sm">
        {children}
      </main>

      {/* Create Workspace Shared Dialog */}
      <CreateWorkspaceDialog
        open={showCreateWsModal}
        onOpenChange={setShowCreateWsModal}
      />
    </div>
  );
}
