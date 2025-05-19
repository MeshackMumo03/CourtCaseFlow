
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { CaseForm } from '@/components/cases/CaseForm';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditCasePage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId || authLoading) return;

    if (!userProfile) {
      router.replace('/login');
      return;
    }
    if (userProfile.role !== 'lawyer') {
      router.replace('/dashboard'); // Redirect if not a lawyer
      return;
    }

    const fetchCaseFile = async () => {
      setLoading(true);
      try {
        const caseDocRef = doc(db, 'cases', caseId);
        const caseDocSnap = await getDoc(caseDocRef);

        if (caseDocSnap.exists()) {
          const data = caseDocSnap.data() as Omit<CaseFile, 'id'>;
          if (data.lawyerUid !== userProfile.uid) {
            setError("Access Denied: You are not authorized to edit this case.");
            setCaseFile(null);
          } else {
            setCaseFile({ id: caseDocSnap.id, ...data });
          }
        } else {
          setError('Case not found.');
        }
      } catch (err) {
        console.error('Error fetching case for edit:', err);
        setError('Failed to load case details for editing.');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseFile();
  }, [caseId, userProfile, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!caseFile) {
    return <div className="flex flex-1 items-center justify-center">Case data not available for editing.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Case Details
      </Button>
      <h1 className="text-3xl font-bold mb-6">Edit Case: {caseFile.caseNumber}</h1>
      <CaseForm initialData={caseFile} caseId={caseId} />
    </div>
  );
}
