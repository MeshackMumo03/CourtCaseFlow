
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile, UserProfile } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Edit3, FilePlus, Loader2, Tags, UploadCloud, User, Mail, Phone, Building, MapPin, ShieldCheck, Briefcase, CalendarCheck2, UserCircle2 } from 'lucide-react';
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
  const [clientProfileForLawyerView, setClientProfileForLawyerView] = useState<UserProfile | null>(null); // For lawyer viewing client details
  
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

    const fetchCaseAndAssociatedProfiles = async () => {
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
            canViewCase = true;
          }

          if (canViewCase) {
            const fetchedCaseFile = { id: caseDocSnap.id, ...data };
            setCaseFile(fetchedCaseFile);

            // Fetch lawyer profile (for both lawyer self-view and client view)
            if (fetchedCaseFile.lawyerUid) {
              const lawyerDocRef = doc(db, 'users', fetchedCaseFile.lawyerUid);
              const lawyerDocSnap = await getDoc(lawyerDocRef);
              if (lawyerDocSnap.exists()) {
                setLawyerProfile(lawyerDocSnap.data() as UserProfile);
              } else {
                console.warn(`Lawyer profile not found for UID: ${fetchedCaseFile.lawyerUid}`);
              }
            }

            // If current user is lawyer, try to fetch client's registered profile
            if (userProfile.role === 'lawyer' && fetchedCaseFile.clientEmail) {
              const clientQuery = query(collection(db, 'users'), where('email', '==', fetchedCaseFile.clientEmail), where('role', '==', 'client'));
              const clientSnapshot = await getDocs(clientQuery);
              if (!clientSnapshot.empty) {
                const clientData = clientSnapshot.docs[0].data() as UserProfile;
                setClientProfileForLawyerView({ ...clientData, uid: clientSnapshot.docs[0].id });
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

    fetchCaseAndAssociatedProfiles();
  }, [caseId, userProfile, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading case details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
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
    return <div className="flex flex-1 items-center justify-center p-6">Case data not available.</div>;
  }

  const isLawyerOwner = userProfile?.role === 'lawyer' && userProfile.uid === caseFile.lawyerUid;

  const handleDocumentUploaded = (dataUri: string, fileName: string) => {
    setUploadedDocumentForTagging({ dataUri, name: fileName });
  };


  return (
    <div className="space-y-6 p-1 md:p-4 lg:p-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Briefcase className="h-7 w-7 text-primary"/> {caseFile.caseNumber}
              </CardTitle>
              <CardDescription>Client for this case: {caseFile.clientName} ({caseFile.clientEmail})</CardDescription>
            </div>
            {isLawyerOwner && (
              <Button asChild variant="outline" className="print:hidden">
                <Link href={`/cases/${caseId}/edit`}> 
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Case
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><strong className="font-medium text-muted-foreground">Court:</strong> {caseFile.court}</div>
          <div>
            <strong className="font-medium text-muted-foreground">Status:</strong>{' '}
            <Badge variant={caseFile.status === 'active' ? 'default' : caseFile.status === 'closed' ? 'destructive' : caseFile.status === 'archived' ? 'outline' : 'secondary'} className="capitalize">
              {caseFile.status}
            </Badge>
          </div>
          {caseFile.hearingDate && (
            <div className="flex items-center gap-1">
              <CalendarCheck2 className="h-4 w-4 text-muted-foreground"/>
              <strong className="font-medium text-muted-foreground">Hearing Date:</strong>{' '}
              {caseFile.hearingDate instanceof Timestamp ? caseFile.hearingDate.toDate().toLocaleDateString() : new Date(caseFile.hearingDate).toLocaleDateString()}
            </div>
          )}
          <div className="md:col-span-2">
            <strong className="font-medium text-muted-foreground">Description:</strong>
            <p className="mt-1 text-sm whitespace-pre-line">{caseFile.description || 'No description provided.'}</p>
          </div>
          <div className="text-xs text-muted-foreground"><strong className="font-medium">Created:</strong>{' '}
            {caseFile.createdAt instanceof Timestamp ? caseFile.createdAt.toDate().toLocaleString() : new Date(caseFile.createdAt).toLocaleString()}
          </div>
           <div className="text-xs text-muted-foreground"><strong className="font-medium">Last Updated:</strong>{' '}
            {caseFile.updatedAt instanceof Timestamp ? caseFile.updatedAt.toDate().toLocaleString() : new Date(caseFile.updatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Lawyer's Info Card (Visible to Client and Lawyer) */}
      {lawyerProfile && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {userProfile?.role === 'client' ? "Your Lawyer's Information" : "Assigned Lawyer"}
            </CardTitle>
            <CardDescription>Contact and professional details for the lawyer on this case.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={lawyerProfile.photoURL || `https://placehold.co/100x100.png?text=${getInitials(lawyerProfile.displayName)}`} alt={lawyerProfile.displayName || "Lawyer"} data-ai-hint="lawyer avatar"/>
                    <AvatarFallback>{getInitials(lawyerProfile.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-xl font-semibold">{lawyerProfile.displayName}</p>
                    {lawyerProfile.lskRegistrationNumber && (
                        <p className="text-sm text-muted-foreground">LSK No: {lawyerProfile.lskRegistrationNumber}</p>
                    )}
                </div>
             </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {lawyerProfile.email && (
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${lawyerProfile.email}`} className="hover:underline break-all">{lawyerProfile.email}</a>
                    </div>
                )}
                {lawyerProfile.phoneNumber && (
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{lawyerProfile.phoneNumber}</span>
                    </div>
                )}
                {lawyerProfile.lawFirmName && (
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{lawyerProfile.lawFirmName}</span>
                    </div>
                )}
                {lawyerProfile.lawFirmAddress && (
                    <div className="flex items-start gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-line">{lawyerProfile.lawFirmAddress}</span>
                    </div>
                )}
                {lawyerProfile.role === 'lawyer' && (lawyerProfile.lskVerificationStatus || lawyerProfile.lawFirmVerificationStatus) && (
                    <div className="md:col-span-2 pt-2 mt-2 border-t">
                        <h4 className="font-medium text-sm mb-1">Verification Status:</h4>
                        <div className="flex flex-wrap gap-2">
                            {lawyerProfile.lskRegistrationNumber && (
                                <Badge variant={lawyerProfile.lskVerificationStatus === 'verified' ? 'default' : lawyerProfile.lskVerificationStatus === 'pending_review' ? 'secondary' : lawyerProfile.lskVerificationStatus === 'rejected' ? 'destructive' : 'outline'} className="capitalize">
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> LSK: {lawyerProfile.lskVerificationStatus?.replace('_', ' ') || 'Unverified'}
                                </Badge>
                            )}
                            {(lawyerProfile.lawFirmName || lawyerProfile.lawFirmAddress) && (
                                 <Badge variant={lawyerProfile.lawFirmVerificationStatus === 'verified' ? 'default' : lawyerProfile.lawFirmVerificationStatus === 'pending_review' ? 'secondary' : lawyerProfile.lawFirmVerificationStatus === 'rejected' ? 'destructive' : 'outline'} className="capitalize">
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Firm: {lawyerProfile.lawFirmVerificationStatus?.replace('_', ' ') || 'Unverified'}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client's Registered Info Card (Visible to Lawyer Owner) */}
      {isLawyerOwner && clientProfileForLawyerView && (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-6 w-6 text-primary" /> Registered Client Details
            </CardTitle>
            <CardDescription>Information from the client's CaseLink profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={clientProfileForLawyerView.photoURL || `https://placehold.co/100x100.png?text=${getInitials(clientProfileForLawyerView.displayName)}`} alt={clientProfileForLawyerView.displayName || "Client"} data-ai-hint="client avatar"/>
                    <AvatarFallback>{getInitials(clientProfileForLawyerView.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-xl font-semibold">{clientProfileForLawyerView.displayName}</p>
                    {clientProfileForLawyerView.createdAt instanceof Timestamp && (
                         <p className="text-sm text-muted-foreground">Joined: {clientProfileForLawyerView.createdAt.toDate().toLocaleDateString()}</p>
                    )}
                </div>
             </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {clientProfileForLawyerView.email && (
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${clientProfileForLawyerView.email}`} className="hover:underline break-all">{clientProfileForLawyerView.email}</a>
                    </div>
                )}
                {clientProfileForLawyerView.phoneNumber && (
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{clientProfileForLawyerView.phoneNumber}</span>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}


      <Card className="shadow-lg print:hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Case Documents</CardTitle>
            {isLawyerOwner && (
                 <Button onClick={() => setShowUploadModal(true)}>
                    <FilePlus className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No documents uploaded yet. (Document listing not yet implemented)</p>
          {uploadedDocumentForTagging && isLawyerOwner && (
            <div className="mt-4">
                <AiTaggingTool
                documentName={uploadedDocumentForTagging.name}
                documentDataUri={uploadedDocumentForTagging.dataUri}
                caseId={caseId}
                onTagsApplied={() => setUploadedDocumentForTagging(null)} 
                />
            </div>
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
