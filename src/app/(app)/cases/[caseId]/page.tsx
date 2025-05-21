
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile, UserProfile } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Edit3, FilePlus, Loader2, Tags, UploadCloud, User, Mail, Phone, Building, MapPin } from 'lucide-react';
import Link from 'next/link';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { AiTaggingTool } from '@/components/documents/AiTaggingTool';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [lawyerProfile, setLawyerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedDocumentForTagging, setUploadedDocumentForTagging] = useState<{ dataUri: string; name: string } | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (!caseId || authLoading) return;

    if (!userProfile) {
        router.replace('/login'); 
        return;
    }

    const fetchCaseAndLawyerDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const caseDocRef = doc(db, 'cases', caseId);
        const caseDocSnap = await getDoc(caseDocRef);

        if (caseDocSnap.exists()) {
          const data = caseDocSnap.data() as Omit<CaseFile, 'id'>;
          
          let canViewCase = false;
          if (userProfile.role === 'lawyer' && data.lawyerUid === userProfile.uid) {
            canViewCase = true;
          } else if (userProfile.role === 'client' && data.clientEmail === userProfile.email) { 
            // Basic check, ideally clientUid would be on caseFile and match userProfile.uid
            canViewCase = true;
          }

          if (canViewCase) {
            const fetchedCaseFile = { id: caseDocSnap.id, ...data };
            setCaseFile(fetchedCaseFile);

            // If current user is a client, fetch the lawyer's profile
            if (userProfile.role === 'client' && fetchedCaseFile.lawyerUid) {
              const lawyerDocRef = doc(db, 'users', fetchedCaseFile.lawyerUid);
              const lawyerDocSnap = await getDoc(lawyerDocRef);
              if (lawyerDocSnap.exists()) {
                setLawyerProfile(lawyerDocSnap.data() as UserProfile);
              } else {
                console.warn(`Lawyer profile not found for UID: ${fetchedCaseFile.lawyerUid}`);
                // Optionally set an error or handle gracefully
              }
            }
          } else {
            setError("Access Denied: You are not authorized to view this case.");
            setCaseFile(null);
          }
        } else {
          setError('Case not found.');
        }
      } catch (err) {
        console.error('Error fetching case details:', err);
        setError('Failed to load case details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseAndLawyerDetails();
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
    setUploadedDocumentForTagging({ dataUri, name: fileName });
    setShowUploadModal(false); 
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
              <CardDescription>Details for case {userProfile?.role === 'lawyer' ? 'managed by your firm' : 'you are involved in'}.</CardDescription>
            </div>
            {isLawyerOwner && (
              <Button asChild variant="outline">
                <Link href={`/cases/${caseId}/edit`}> 
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

      {userProfile?.role === 'client' && lawyerProfile && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Your Lawyer's Information
            </CardTitle>
            <CardDescription>Contact details for your legal representative.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={lawyerProfile.photoURL || `https://placehold.co/100x100.png?text=${getInitials(lawyerProfile.displayName)}`} alt={lawyerProfile.displayName || "Lawyer"} data-ai-hint="lawyer avatar"/>
                    <AvatarFallback>{getInitials(lawyerProfile.displayName)}</AvatarFallback>
                </Avatar>
                <p className="text-lg font-semibold">{lawyerProfile.displayName}</p>
             </div>
             {lawyerProfile.email && (
                <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lawyerProfile.email}`} className="hover:underline">{lawyerProfile.email}</a>
                </div>
             )}
             {lawyerProfile.phoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lawyerProfile.phoneNumber}</span>
                </div>
             )}
             {lawyerProfile.lawFirmName && (
                <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{lawyerProfile.lawFirmName}</span>
                </div>
             )}
             {lawyerProfile.lawFirmAddress && (
                <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="whitespace-pre-line">{lawyerProfile.lawFirmAddress}</span>
                </div>
             )}
          </CardContent>
        </Card>
      )}


      {/* Documents Section */}
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
          {uploadedDocumentForTagging && isLawyerOwner && (
            <AiTaggingTool
              documentName={uploadedDocumentForTagging.name}
              documentDataUri={uploadedDocumentForTagging.dataUri}
              caseId={caseId}
              onTagsApplied={() => setUploadedDocumentForTagging(null)} 
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
