'use client';

import { Loader2, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateUserVerificationStatusAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Kind = 'lsk' | 'lawFirm';
type Status = 'verified' | 'rejected';

export function VerificationActions({ userId, lskPending, firmPending }: { userId: string; lskPending: boolean; firmPending: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function update(verificationType: Kind, newStatus: Status) {
    setBusy(`${verificationType}-${newStatus}`);
    const result = await updateUserVerificationStatusAction({ userId, verificationType, newStatus });
    setBusy(null);
    toast(result.success ? { title: result.message } : { variant: 'destructive', title: 'Error', description: result.message });
    if (result.success) router.refresh();
  }

  function renderRow(kind: Kind, label: string) {
    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
        <Button variant="outline" size="sm" className="text-xs" disabled={!!busy} onClick={() => update(kind, 'verified')}>
          {busy === `${kind}-verified` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="mr-1 h-3 w-3" />} Approve {label}
        </Button>
        <Button variant="destructive" size="sm" className="text-xs" disabled={!!busy} onClick={() => update(kind, 'rejected')}>
          {busy === `${kind}-rejected` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="mr-1 h-3 w-3" />} Reject {label}
        </Button>
      </div>
    );
  }

  if (!lskPending && !firmPending) return <span className="text-xs italic text-muted-foreground">No action needed</span>;
  return (
    <div className="space-y-1">
      {lskPending && renderRow('lsk', 'LSK')}
      {firmPending && renderRow('lawFirm', 'Firm')}
    </div>
  );
}
