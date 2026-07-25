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
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, currentWorkspace, logout, isLoading, setCurrentWorkspace } = useAuth();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
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

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Knowledge Base', href: '/dashboard/documents', icon: FileText },
    { name: 'AI Agents', href: '/dashboard/agents', icon: Bot },
    { name: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Workflows', href: '/dashboard/workflows', icon: Cpu },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/30 text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-background border-r border-border flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight font-heading text-foreground">
                Forge<span className="text-primary">AI</span>
              </span>
            </Link>
          </div>

          {/* Workspace Switcher */}
          <div className="p-4 relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="w-full white-panel-interactive px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {currentWorkspace?.name || "Personal Workspace"}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {currentWorkspace?.role || "Owner"}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* Workspace Dropdown */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-4 right-4 top-16 z-50 white-panel border border-border rounded-xl p-2 shadow-lg space-y-1">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground px-3 py-1">
                  Workspaces
                </div>
                {user.workspaces?.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentWorkspace?.id === ws.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {currentWorkspace?.id === ws.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user.name ? user.name[0] : user.email[0]}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-foreground truncate">
                  {user.name || user.email.split('@')[0]}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-background border-b border-border px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              {currentWorkspace?.name || "Workspace"}
            </span>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-sm font-semibold text-foreground capitalize">
              {pathname === '/dashboard' ? 'Overview' : pathname.replace('/dashboard/', '')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/chat">
              <Button variant="primary" size="sm">
                <Sparkles className="w-3.5 h-3.5" />
                New AI Chat
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
