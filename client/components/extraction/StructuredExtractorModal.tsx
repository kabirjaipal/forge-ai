'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Download, Sparkles, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface StructuredExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  documentId?: string;
  documentName?: string;
}

export function StructuredExtractorModal({
  isOpen,
  onClose,
  workspaceId,
  documentId,
  documentName,
}: StructuredExtractorModalProps) {
  const [templateType, setTemplateType] = useState<'invoice' | 'resume' | 'meeting' | 'custom'>('invoice');
  const [customSchema, setCustomSchema] = useState('');
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
    setError(null);
    setIsExtracting(true);
    setExtractedResult(null);

    try {
      const res = await api.post<any>(`/workspaces/${workspaceId}/extract`, {
        documentId: documentId || undefined,
        rawText: documentId ? undefined : rawText,
        templateType,
        customSchema: templateType === 'custom' ? customSchema : undefined,
      });

      if (res.data?.extractedData) {
        setExtractedResult(res.data.extractedData);
      } else {
        setError('No data extracted.');
      }
    } catch (err: any) {
      setError(err.message || 'Extraction failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = () => {
    if (!extractedResult) return;
    navigator.clipboard.writeText(JSON.stringify(extractedResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!extractedResult) return;
    const blob = new Blob([JSON.stringify(extractedResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_${templateType}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Structured JSON Extractor
          </DialogTitle>
          <DialogDescription>
            {documentName
              ? `Extracting structured fields from document: ${documentName}`
              : 'Extract structured JSON from custom text or document.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Extraction Template</label>
            <Select value={templateType} onValueChange={(val: any) => setTemplateType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">🧾 Invoice & Billing Extractor</SelectItem>
                <SelectItem value="resume">📄 Resume & Candidate Parser</SelectItem>
                <SelectItem value="meeting">📝 Meeting Notes & Action Items</SelectItem>
                <SelectItem value="custom">⚙️ Custom JSON Schema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {templateType === 'custom' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Custom Schema Instructions</label>
              <Textarea
                placeholder="Specify target JSON keys, e.g. { companyName: string, founders: string[] }"
                value={customSchema}
                onChange={(e) => setCustomSchema(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {!documentId && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Input Text</label>
              <Textarea
                placeholder="Paste raw text here to extract structured JSON..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <Button
            onClick={handleExtract}
            disabled={isExtracting || (!documentId && !rawText.trim())}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Data via AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Structured Extraction
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          {extractedResult && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Extracted Output (JSON)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download JSON
                  </Button>
                </div>
              </div>
              <pre className="p-4 bg-gray-50 text-gray-900 border rounded-lg text-xs overflow-x-auto max-h-64 font-mono leading-relaxed">
                {JSON.stringify(extractedResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
