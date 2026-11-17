import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CaseStatus, VerificationStatus } from '@/types';

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const variant =
    status === 'active' ? 'default' : status === 'closed' ? 'destructive' : status === 'archived' ? 'outline' : 'secondary';
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

export function VerificationBadge({ label, status }: { label: string; status: VerificationStatus }) {
  const variant =
    status === 'verified' ? 'default' : status === 'pending_review' ? 'secondary' : status === 'rejected' ? 'destructive' : 'outline';
  return (
    <Badge variant={variant} className="capitalize">
      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {label}: {status.replace('_', ' ')}
    </Badge>
  );
}
