'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FilePlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDocuments, useDeleteDocument, uploadDocument } from '@/lib/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  doc: '📝',
  md: '📋',
  csv: '📊',
  txt: '📃',
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  processing: { label: 'Processing', icon: Loader2, color: 'text-info', bg: 'bg-info/10 border-info/20' },
  completed: { label: 'Indexed', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  error: { label: 'Error', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10 border-danger/20' },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const { data: documents, isLoading } = useDocuments(workspaceId);
  const deleteDoc = useDeleteDocument(workspaceId);
  const queryClient = useQueryClient();

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!workspaceId) {
        setUploadError('No workspace selected. Please refresh the page or create a workspace first.');
        return;
      }
      setUploadError(null);
      setUploading(true);

      const results = await Promise.allSettled(
        Array.from(files).map((file) => uploadDocument(workspaceId, file)),
      );

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason?.message || 'Upload failed');

      const failures = results
        .filter(
          (r): r is PromiseFulfilledResult<{ success: boolean; error?: string }> =>
            r.status === 'fulfilled' && !r.value.success,
        )
        .map((r) => r.value.error || 'Upload failed');

      if (errors.length || failures.length) {
        setUploadError([...errors, ...failures].join(', '));
      }

      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
    [workspaceId, queryClient],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents to generate vector embeddings for RAG-powered AI conversations.
        </p>
      </div>

      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed transition-all rounded-2xl cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <CardContent className="p-12 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.md,.csv,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isDragging ? 'bg-primary text-primary-foreground scale-110' : 'bg-primary/10 text-primary'
              }`}
            >
              {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {uploading ? 'Uploading...' : isDragging ? 'Drop files here' : 'Drop files or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports PDF, DOCX, Markdown, CSV, TXT — up to 50MB per file
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{uploadError}</span>
          <button className="ml-auto" onClick={() => setUploadError(null)}>✕</button>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Documents ({documents?.length ?? 0})
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : documents?.length === 0 ? (
          <Card className="white-panel rounded-2xl border-border">
            <CardContent className="p-12 text-center">
              <FilePlus className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-foreground font-medium">No documents yet</p>
              <p className="text-muted-foreground text-sm mt-1">Upload your first document to start building your knowledge base.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents?.map((doc) => {
              const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const emoji = FILE_TYPE_ICONS[doc.fileType] || '📄';
              return (
                <Card key={doc.id} className="white-panel border-border rounded-xl hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl w-10 text-center">{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground uppercase font-mono">{doc.fileType}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</span>
                          {doc._count && (
                            <>
                              <span className="text-muted-foreground text-xs">·</span>
                              <span className="text-xs text-muted-foreground">{doc._count.chunks} chunks</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </div>
                      {deleteConfirm === doc.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-danger font-medium">Delete?</span>
                          <Button
                            size="sm"
                            variant="danger"
                            className="h-7 px-2 text-xs"
                            onClick={() => { deleteDoc.mutate(doc.id); setDeleteConfirm(null); }}
                          >
                            Yes
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteConfirm(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}
                          className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
