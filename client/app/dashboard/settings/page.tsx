'use client';

import React, { useState } from 'react';
import { Settings, Save, AlertTriangle, Loader2, CheckCircle2, Users, Layers, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
  const { currentWorkspace, user } = useAuth();
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [description, setDescription] = useState(currentWorkspace?.description || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.put(`/workspaces/${currentWorkspace.id}`, { name, description });
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error?.message || 'Failed to update workspace');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace configuration and membership.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Column: General Settings */}
        <div className="lg:col-span-2">
          <Card className="white-panel border-border rounded-2xl h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                {saved && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Workspace settings saved successfully.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="My Workspace"
                    className="bg-background border-border h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="What is this workspace for?"
                    className="bg-background border-border rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Slug</Label>
                  <Input
                    value={currentWorkspace.slug}
                    disabled
                    className="bg-muted border-border h-10 rounded-lg text-muted-foreground font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The slug cannot be changed after creation.</p>
                </div>

                <Button type="submit" variant="primary" size="default" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Membership & Workspace Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Membership */}
          <Card className="white-panel border-border rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-info" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm uppercase">
                  {user?.name?.[0] || user?.email?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{user?.name || user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <span className="ml-auto text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  {currentWorkspace.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Team member management with invitations is coming in a future update.</p>
            </CardContent>
          </Card>

          {/* Workspace Info */}
          <Card className="white-panel border-border rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Workspace Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Workspace ID</span>
                <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded truncate max-w-[160px]">{currentWorkspace.id}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded">{currentWorkspace.slug}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
