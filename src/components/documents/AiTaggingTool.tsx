'use client';

import { CheckCircle, Loader2, Tags, X, XCircle } from 'lucide-react';
import { useState } from 'react';

import { saveDocumentTagsAction, suggestDocumentTagsAction } from '@/actions/documents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Props {
  caseId: string;
  documentId: string;
  documentName: string;
  onDone: () => void;
}

export function AiTaggingTool({ caseId, documentId, documentName, onDone }: Props) {
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [applying, setApplying] = useState(false);
  const busy = suggesting || applying;

  async function suggest() {
    setSuggesting(true);
    setError(null);
    // The server reads the file from storage itself; the browser never sends document contents to the AI.
    const result = await suggestDocumentTagsAction(caseId, documentId);
    setSuggesting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setTags(result.data.tags);
  }

  async function apply() {
    setApplying(true);
    const result = await saveDocumentTagsAction(caseId, documentId, tags);
    setApplying(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Failed to apply tags', description: result.message });
      return;
    }
    toast({ title: 'Tags applied' });
    onDone();
  }

  return (
    <Card className="mt-6 border-primary/50 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-6 w-6 text-primary" />
          AI Document Tagging
        </CardTitle>
        <CardDescription>
          Suggest tags for <strong>{documentName}</strong>. You can remove any before applying.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
            <XCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm">
                {tag}
                <button type="button" className="ml-1" onClick={() => setTags((t) => t.filter((x) => x !== tag))} aria-label={`Remove ${tag}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {suggesting && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">AI is reading the document...</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Skip for now
        </Button>
        {tags.length === 0 ? (
          <Button onClick={suggest} disabled={busy}>
            {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tags className="mr-2 h-4 w-4" />}
            Suggest Tags
          </Button>
        ) : (
          <Button onClick={apply} disabled={busy}>
            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Apply Tags
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
