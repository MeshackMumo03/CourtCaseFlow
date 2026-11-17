'use client';

import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { addCommentAction, getCommentsAction } from '@/actions/comments';
import { LocalTime } from '@/components/common/LocalTime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn, getInitials } from '@/lib/utils';
import type { CaseComment } from '@/types';

const POLL_MS = 15_000;

interface Props {
  caseId: string;
  initialComments: CaseComment[];
  currentUserId: string;
  currentRole: 'lawyer' | 'client';
}

export function CommentsPanel({ caseId, initialComments, currentUserId, currentRole }: Props) {
  const { toast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const result = await getCommentsAction(caseId);
    if (result.success) setComments(result.data);
  }, [caseId]);

  // Poll for new messages while the tab is visible (replaces Firestore's live listener).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments.length]);

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    const result = await addCommentAction(caseId, text);
    if (result.success) {
      setText('');
      await refresh();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setPosting(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Case Log &amp; Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 space-y-4 overflow-y-auto rounded-md border bg-muted/20 p-4">
          {comments.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No comments yet. Start the conversation.</p>
            </div>
          )}
          {comments.map((c) => {
            const mine = c.authorId === currentUserId;
            return (
              <div key={c.id} className={cn('flex items-start gap-3', mine ? 'justify-end' : 'justify-start')}>
                {!mine && (
                  <Avatar className="h-8 w-8">
                    {c.authorImage && <AvatarImage src={c.authorImage} alt={c.authorName} />}
                    <AvatarFallback>{getInitials(c.authorName)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('max-w-md rounded-lg px-4 py-2', mine ? 'bg-primary text-primary-foreground' : 'border bg-card')}>
                  <p className="text-xs font-semibold">
                    {c.authorName} <span className="font-normal capitalize opacity-70">· {c.authorRole}</span>
                  </p>
                  {/* Rendered as text, never as HTML. */}
                  <p className="whitespace-pre-wrap text-sm">{c.text}</p>
                  <p className="mt-1 text-right text-xs opacity-70">
                    <LocalTime value={c.createdAt} format="datetime" />
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 pt-2">
          <Textarea
            placeholder={currentRole === 'lawyer' ? 'Post an update for your client...' : 'Type your message...'}
            value={text}
            maxLength={5000}
            onChange={(e) => setText(e.target.value)}
            disabled={posting}
          />
          <Button onClick={post} disabled={posting || !text.trim()} aria-label="Send message">
            {posting ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
