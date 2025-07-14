
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tags, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tagLegalDocument, type TagLegalDocumentInput } from '@/ai/flows/tag-legal-documents';
import { saveDocumentTagsAction } from '@/actions/documents';

interface AiTaggingToolProps {
  documentName: string;
  documentDataUri: string;
  caseId: string;
  documentId: string;
  onTagsApplied: () => void;
}

export function AiTaggingTool({
  documentName,
  documentDataUri,
  caseId,
  documentId,
  onTagsApplied,
}: AiTaggingToolProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isLoading = isSuggesting || isApplying;

  const handleSuggestTags = async () => {
    setIsSuggesting(true);
    setError(null);
    setSuggestedTags([]);

    const input: TagLegalDocumentInput = {
      documentDataUri: documentDataUri,
      documentDescription: `Legal document named "${documentName}" for case ID ${caseId}.`,
    };

    try {
      const result = await tagLegalDocument(input);
      if (result && result.tags) {
        setSuggestedTags(result.tags);
        toast({ title: 'Tags Suggested', description: `${result.tags.length} tags suggested by AI.` });
      } else {
        setError('AI could not suggest tags for this document.');
        toast({ variant: 'destructive', title: 'Tagging Failed', description: 'No tags were returned.' });
      }
    } catch (err: any) {
      console.error('AI Tagging Error:', err);
      setError(err.message || 'An error occurred while suggesting tags.');
      toast({ variant: 'destructive', title: 'Tagging Error', description: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleApplyTags = async () => {
    if (suggestedTags.length === 0) {
        toast({variant: 'destructive', title: "No Tags", description: "There are no tags to apply."})
        return;
    }
    setIsApplying(true);
    
    try {
        const result = await saveDocumentTagsAction(caseId, documentId, suggestedTags);
        if (result.success) {
            toast({ title: 'Tags Applied', description: 'Tags have been saved for the document.' });
            onTagsApplied();
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Apply Tags', description: error.message || 'An unexpected error occurred.' });
    } finally {
        setIsApplying(false);
    }
  };

  return (
    <Card className="mt-6 shadow-md border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-6 w-6 text-primary" />
          AI Document Tagging
        </CardTitle>
        <CardDescription>
          Document <strong>{documentName}</strong> has been uploaded. Would you like AI to suggest relevant tags?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        {suggestedTags.length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="font-semibold">Suggested Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {isSuggesting && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">AI is reading the document...</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
         <Button variant="ghost" onClick={onTagsApplied} disabled={isLoading}>
            Skip for now
        </Button>
        <div className="flex gap-2">
        {suggestedTags.length === 0 ? (
          <Button onClick={handleSuggestTags} disabled={isLoading}>
            {isSuggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Tags className="mr-2 h-4 w-4" />
            )}
            Suggest Tags
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => { setSuggestedTags([]); setError(null); }} disabled={isLoading}>
              Clear Suggestions
            </Button>
            <Button onClick={handleApplyTags} disabled={isLoading}>
              {isApplying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Apply Tags
            </Button>
          </>
        )}
        </div>
      </CardFooter>
    </Card>
  );
}
