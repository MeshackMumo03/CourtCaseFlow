'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tags, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tagLegalDocument, type TagLegalDocumentInput } from '@/ai/flows/tag-legal-documents';
// import { saveDocumentTagsAction } from '@/actions/documents'; // Placeholder for saving tags

interface AiTaggingToolProps {
  documentName: string;
  documentDataUri: string;
  caseId: string; // To associate tags with the case/document in DB
  documentId?: string; // If document already exists in DB and we're adding tags
  onTagsApplied: () => void;
}

export function AiTaggingTool({
  documentName,
  documentDataUri,
  caseId,
  documentId,
  onTagsApplied,
}: AiTaggingToolProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuggestTags = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleApplyTags = async () => {
    setIsLoading(true);
    // In a real app, you'd call a server action to save these tags to Firestore
    // associated with the documentId or create the document entry if it's new.
    // Example: await saveDocumentTagsAction(caseId, documentId, suggestedTags);
    console.log('Applying tags:', suggestedTags, 'for document:', documentName, 'case:', caseId, 'docId:', documentId);
    
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({ title: 'Tags Applied', description: 'Tags have been saved for the document.' });
    setIsLoading(false);
    onTagsApplied();
  };

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-6 w-6 text-primary" />
          AI Document Tagging
        </CardTitle>
        <CardDescription>
          Let AI suggest relevant tags for: <strong>{documentName}</strong>
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
        {(isLoading && suggestedTags.length === 0) && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">AI is thinking...</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {suggestedTags.length === 0 && (
          <Button onClick={handleSuggestTags} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Tags className="mr-2 h-4 w-4" />
            )}
            Suggest Tags
          </Button>
        )}
        {suggestedTags.length > 0 && (
          <>
            <Button variant="outline" onClick={() => { setSuggestedTags([]); setError(null); }} disabled={isLoading}>
              Clear Suggestions
            </Button>
            <Button onClick={handleApplyTags} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Apply Tags
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
