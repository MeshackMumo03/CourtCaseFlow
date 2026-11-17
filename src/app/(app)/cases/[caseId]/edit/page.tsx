import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CaseForm } from '@/components/cases/CaseForm';
import { Button } from '@/components/ui/button';
import { getCaseAccess } from '@/server/cases';
import { requirePageUser } from '@/server/session';

export default async function EditCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const user = await requirePageUser(['lawyer']);
  const access = await getCaseAccess(caseId, user);
  // Same response for "doesn't exist" and "not yours", so case IDs can't be probed.
  if (!access?.isOwner) notFound();

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" asChild className="mb-6">
        <Link href={`/cases/${caseId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Case Details
        </Link>
      </Button>
      <h1 className="mb-6 text-3xl font-bold">Edit Case: {access.caseFile.caseNumber}</h1>
      <CaseForm initialData={access.caseFile} />
    </div>
  );
}
