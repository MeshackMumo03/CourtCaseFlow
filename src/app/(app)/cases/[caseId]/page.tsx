'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Edit3, FilePlus, Loader2, Tags, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { AiTaggingTool } from '@/components/documents/AiTaggingTool';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For document upload and AI tagging demo
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedDocumentForTagging, setUploadedDocumentForTagging] = useState<{ dataUri: string; name: string } | null>(null);


  useEffect(() => {
    if (!caseId || authLoading) return;

    if (!userProfile) {
        router.replace('/login'); // Redirect if not authenticated
        return;
    }

    const fetchCaseFile = async () => {
      try {
        setLoading(true);
        const caseDocRef = doc(db, 'cases', caseId);
        const caseDocSnap = await getDoc(caseDocRef);

        if (caseDocSnap.exists()) {
          const data = caseDocSnap.data() as Omit<CaseFile, 'id'>;
          // Basic access control: lawyer who owns it or assigned client (client part not implemented yet)
          if (userProfile.role === 'lawyer' && data.lawyerUid !== userProfile.uid) {
             setError("Access Denied: You are not authorized to view this case.");
             setCaseFile(null);
          } 
          // else if (userProfile.role === 'client' && data.clientUid !== userProfile.uid) { // TODO: Add clientUid check
          //    setError("Access Denied: This case is not assigned to you.");
          //    setCaseFile(null);
          // }
          else {
            setCaseFile({ id: caseDocSnap.id, ...data });
          }
        } else {
          setError('Case not found.');
        }
      } catch (err) {
        console.error('Error fetching case:', err);
        setError('Failed to load case details.');
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
    return <div className="flex flex-1 items-center justify-center">Case data not available.</div>;
  }

  const isLawyerOwner = userProfile?.role === 'lawyer' && userProfile.uid === caseFile.lawyerUid;

  const handleDocumentUploaded = (dataUri: string, fileName: string) => {
    // This is a simplified handler for demonstration.
    // In a real app, you'd save the document to storage and DB first.
    // Then, offer AI tagging.
    setUploadedDocumentForTagging({ dataUri, name: fileName });
    setShowUploadModal(false); // Close upload modal
  };


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cases
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-3xl">{caseFile.caseNumber}</CardTitle>
              <CardDescription>Details for case managed by your firm.</CardDescription>
            </div>
            {isLawyerOwner && (
              <Button asChild variant="outline">
                <Link href={`/cases/${caseId}/edit`}> {/* TODO: Create edit page or modal */}
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Case
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><strong className="font-medium text-muted-foreground">Client Name:</strong> {caseFile.clientName}</div>
          <div><strong className="font-medium text-muted-foreground">Client Email:</strong> {caseFile.clientEmail}</div>
          <div><strong className="font-medium text-muted-foreground">Court:</strong> {caseFile.court}</div>
          <div>
            <strong className="font-medium text-muted-foreground">Status:</strong>{' '}
            <Badge variant={caseFile.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {caseFile.status}
            </Badge>
          </div>
          {caseFile.hearingDate && (
            <div>
              <strong className="font-medium text-muted-foreground">Hearing Date:</strong>{' '}
              {caseFile.hearingDate instanceof Timestamp ? caseFile.hearingDate.toDate().toLocaleDateString() : new Date(caseFile.hearingDate).toLocaleDateString()}
            </div>
          )}
          <div className="md:col-span-2">
            <strong className="font-medium text-muted-foreground">Description:</strong>
            <p className="mt-1 text-sm">{caseFile.description || 'No description provided.'}</p>
          </div>
          <div className="md:col-span-2">
            <strong className="font-medium text-muted-foreground">Created At:</strong>{' '}
            {caseFile.createdAt instanceof Timestamp ? caseFile.createdAt.toDate().toLocaleString() : new Date(caseFile.createdAt).toLocaleString()}
          </div>
           <div className="md:col-span-2">
            <strong className="font-medium text-muted-foreground">Last Updated:</strong>{' '}
            {caseFile.updatedAt instanceof Timestamp ? caseFile.updatedAt.toDate().toLocaleString() : new Date(caseFile.updatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Documents Section - Placeholder */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Case Documents</CardTitle>
            {isLawyerOwner && (
                 <Button onClick={() => setShowUploadModal(true)}>
                    <FilePlus className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            )}
        </CardHeader>
        <CardContent>
          {/* TODO: List documents here */}
          <p className="text-muted-foreground">No documents uploaded yet.</p>
          {/* Example of how AI tagging could be triggered post-upload */}
          {uploadedDocumentForTagging && isLawyerOwner && (
            <AiTaggingTool
              documentName={uploadedDocumentForTagging.name}
              documentDataUri={uploadedDocumentForTagging.dataUri}
              caseId={caseId}
              onTagsApplied={() => setUploadedDocumentForTagging(null)} // Clear after applying
            />
          )}
        </CardContent>
      </Card>

      {isLawyerOwner && showUploadModal && (
         <DocumentUploadForm 
            caseId={caseId} 
            onClose={() => setShowUploadModal(false)}
            onDocumentUploaded={handleDocumentUploaded}
        />
      )}
    </div>
  );
}
