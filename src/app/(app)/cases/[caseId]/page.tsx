
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, getDoc, Timestamp, query, collection, where, getDocs, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile, UserProfile, CaseDocument, CaseComment } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Edit3, FilePlus, Loader2, Tags, User, Mail, Phone, Building, MapPin, ShieldCheck, Briefcase, CalendarCheck2, UserCircle2, FileText, Download, MessageSquare, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { AiTaggingTool } from '@/components/documents/AiTaggingTool';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { addCommentAction } from '@/actions/comments';
import { cn, toSerializable } from '@/lib/utils';
import { deleteDocumentAction } from '@/actions/documents';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [lawyerProfile, setLawyerProfile] = useState<UserProfile | null>(null);
  const [clientProfileForLawyerView, setClientProfileForLawyerView] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [comments, setComments] = useState<CaseComment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedDocumentForTagging, setUploadedDocumentForTagging] = useState<{ document: CaseDocument, dataUri: string } | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [docToDelete, setDocToDelete] = useState<CaseDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);


  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const fetchCaseAndAssociatedProfiles = useCallback(async () => {
    if (!userProfile || !caseId) return;
    setLoading(true);
    setError(null);
    try {
      const caseDocRef = doc(db, 'cases', caseId);
      const caseDocSnap = await getDoc(caseDocRef);

      if (caseDocSnap.exists()) {
        const data = toSerializable(caseDocSnap.data()) as Omit<CaseFile, 'id'>;
        
        let canViewCase = false;
        if (userProfile.role === 'lawyer' && data.lawyerUid === userProfile.uid) {
          canViewCase = true;
        } else if (userProfile.role === 'client' && data.clientEmail === userProfile.email) { 
          canViewCase = true;
        }

        if (canViewCase) {
          const fetchedCaseFile = { id: caseDocSnap.id, ...data } as CaseFile;
          setCaseFile(fetchedCaseFile);

          if (fetchedCaseFile.lawyerUid) {
            const lawyerDocRef = doc(db, 'users', fetchedCaseFile.lawyerUid);
            const lawyerDocSnap = await getDoc(lawyerDocRef);
            if (lawyerDocSnap.exists()) {
              setLawyerProfile(toSerializable(lawyerDocSnap.data()) as UserProfile);
            } else {
              console.warn(`Lawyer profile not found for UID: ${fetchedCaseFile.lawyerUid}`);
            }
          }

          if (userProfile.role === 'lawyer' && fetchedCaseFile.clientEmail) {
            const clientQuery = query(collection(db, 'users'), where('email', '==', fetchedCaseFile.clientEmail), where('role', '==', 'client'));
            const clientSnapshot = await getDocs(clientQuery);
            if (!clientSnapshot.empty) {
              const clientData = clientSnapshot.docs[0].data();
              setClientProfileForLawyerView({ ...toSerializable(clientData), uid: clientSnapshot.docs[0].id } as UserProfile);
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
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load case details.'});
    } finally {
      setLoading(false);
    }
  }, [caseId, userProfile, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      router.replace('/login');
      return;
    }
    if (caseId) {
        fetchCaseAndAssociatedProfiles();
    } else {
        setError("Case ID is missing.");
        setLoading(false);
    }
  }, [caseId, userProfile, authLoading, router, fetchCaseAndAssociatedProfiles]);

  useEffect(() => {
    let unsubDocs: Unsubscribe | undefined;
    let unsubComments: Unsubscribe | undefined;

    if (caseId && caseFile) { // Only fetch if caseFile is loaded and user has access
        // Documents listener
        setLoadingDocuments(true);
        const documentsRef = collection(db, 'cases', caseId, 'documents');
        const docsQuery = query(documentsRef, orderBy('uploadedAt', 'desc'));
        unsubDocs = onSnapshot(docsQuery, (snapshot) => {
            const fetchedDocs: CaseDocument[] = snapshot.docs.map(doc => ({ id: doc.id, ...toSerializable(doc.data()) } as CaseDocument));
            setDocuments(fetchedDocs);
            setLoadingDocuments(false);
        }, (err) => {
            console.error("Error fetching documents:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load documents.'});
            setLoadingDocuments(false);
        });

        // Comments listener
        setLoadingComments(true);
        const commentsRef = collection(db, 'cases', caseId, 'comments');
        const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
        unsubComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments: CaseComment[] = snapshot.docs.map(doc => ({ id: doc.id, ...toSerializable(doc.data()) } as CaseComment));
            setComments(fetchedComments);
            setLoadingComments(false);
            // Scroll to bottom after comments are loaded/updated
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }, (err) => {
            console.error("Error fetching comments:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load comments.'});
            setLoadingComments(false);
        });
    }

    return () => {
        if (unsubDocs) unsubDocs();
        if (unsubComments) unsubComments();
    };
}, [caseId, caseFile, toast]);


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
  
  const handleDocumentUploaded = (document: CaseDocument, dataUri: string) => {
    // The onSnapshot listener will automatically update the document list.
    // We just need to show the AI tagging tool.
    setUploadedDocumentForTagging({ document, dataUri });
  };
  
  const handleTagsApplied = () => {
    // onSnapshot will handle the update, so we just close the tagging tool.
    setUploadedDocumentForTagging(null);
  };

  const handlePostComment = async () => {
      if (!user || !userProfile || !newComment.trim()) return;

      setIsPostingComment(true);
      const result = await addCommentAction(caseId, {
          text: newComment,
          authorUid: user.uid,
          authorName: userProfile.displayName || 'Anonymous',
          authorRole: userProfile.role,
      });

      if (result.success) {
          setNewComment('');
          // Optional: Send email notification here
          // if (userProfile.role === 'lawyer' && clientProfileForLawyerView?.email) {
          //   sendEmailAction({ to: clientProfileForLawyerView.email, ... })
          // }
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
      setIsPostingComment(false);
  }

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setIsDeletingDoc(docToDelete.id);
    const result = await deleteDocumentAction(caseId, docToDelete.id, docToDelete.storagePath);

    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    
    setDocToDelete(null);
    setIsDeletingDoc(null);
  }


  return (
    <div className="space-y-6 p-1 md:p-4 lg:p-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
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
                    <strong className="font-medium text-muted-foreground">Hearing:</strong>{' '}
                    {new Date(caseFile.hearingDate as any).toLocaleString()}
                    </div>
                )}
                <div className="md:col-span-2">
                    <strong className="font-medium text-muted-foreground">Description:</strong>
                    <p className="mt-1 text-sm whitespace-pre-line">{caseFile.description || 'No description provided.'}</p>
                </div>
                <div className="text-xs text-muted-foreground"><strong className="font-medium">Created:</strong>{' '}
                    {new Date(caseFile.createdAt as any).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground"><strong className="font-medium">Last Updated:</strong>{' '}
                    {new Date(caseFile.updatedAt as any).toLocaleString()}
                </div>
                </CardContent>
            </Card>
            
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
                {loadingDocuments && (
                    <div className="flex items-center justify-center p-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading documents...</span>
                    </div>
                )}
                {!loadingDocuments && documents.length === 0 && !uploadedDocumentForTagging && (
                    <div className="text-center py-10 border border-dashed rounded-md">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-muted-foreground">No documents uploaded yet.</p>
                    {isLawyerOwner && <p className="text-sm text-muted-foreground">Click "Upload Document" to add files to this case.</p>}
                    </div>
                )}
                {!loadingDocuments && documents.length > 0 && (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium break-all max-w-xs">
                            <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                {doc.name}
                            </a>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground break-all max-w-xs">{doc.description || 'N/A'}</TableCell>
                            <TableCell className="text-sm">
                                {new Date(doc.uploadedAt as any).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                            {doc.tags && doc.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                {doc.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground">No tags</span>
                            )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-4 w-4" /> Download
                                    </a>
                                </Button>
                                {isLawyerOwner && (
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => setDocToDelete(doc)}
                                        disabled={isDeletingDoc === doc.id}
                                    >
                                        {isDeletingDoc === doc.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                )}
                {uploadedDocumentForTagging && isLawyerOwner && (
                    <div className="mt-4">
                        <AiTaggingTool
                        documentName={uploadedDocumentForTagging.document.name}
                        documentDataUri={uploadedDocumentForTagging.dataUri}
                        caseId={caseId}
                        documentId={uploadedDocumentForTagging.document.id}
                        onTagsApplied={handleTagsApplied}
                        />
                    </div>
                )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        Case Log & Communication
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-96 overflow-y-auto space-y-4 p-4 border rounded-md bg-muted/20">
                        {loadingComments && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                        {!loadingComments && comments.length === 0 && (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-muted-foreground">No comments yet. Start the conversation.</p>
                            </div>
                        )}
                        {comments.map(comment => (
                            <div key={comment.id} className={cn("flex items-start gap-3", comment.authorUid === user?.uid ? "justify-end" : "justify-start")}>
                                {comment.authorUid !== user?.uid && (
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.authorRole === 'lawyer' ? lawyerProfile?.photoURL : clientProfileForLawyerView?.photoURL} />
                                        <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-md rounded-lg px-4 py-2", comment.authorUid === user?.uid ? "bg-primary text-primary-foreground" : "bg-card border")}>
                                    <p className="text-xs font-semibold">{comment.authorName}</p>
                                    <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">
                                        {new Date(comment.createdAt as any).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                {comment.authorUid === user?.uid && (
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={userProfile?.photoURL} />
                                        <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         <div ref={commentsEndRef} />
                    </div>
                     <div className="flex gap-2 pt-2">
                        <Textarea
                            placeholder={userProfile?.role === 'lawyer' ? "Post an update for your client..." : "Type your message..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isPostingComment}
                        />
                        <Button onClick={handlePostComment} disabled={isPostingComment || !newComment.trim()}>
                            {isPostingComment ? <Loader2 className="animate-spin" /> : <Send />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="xl:col-span-1 space-y-6">
            {lawyerProfile && (
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" />
                    {userProfile?.role === 'client' ? "Your Lawyer's Information" : "Assigned Lawyer"}
                    </CardTitle>
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
                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm">
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
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="whitespace-pre-line">{lawyerProfile.lawFirmAddress}</span>
                            </div>
                        )}
                        {lawyerProfile.role === 'lawyer' && (lawyerProfile.lskVerificationStatus || lawyerProfile.lawFirmVerificationStatus) && (
                            <div className="pt-2 mt-2 border-t">
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

            {isLawyerOwner && clientProfileForLawyerView && (
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle2 className="h-6 w-6 text-primary" /> Registered Client Details
                    </CardTitle>
                    <CardDescription>Information from the client's profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={clientProfileForLawyerView.photoURL || `https://placehold.co/100x100.png?text=${getInitials(clientProfileForLawyerView.displayName)}`} alt={clientProfileForLawyerView.displayName || "Client"} data-ai-hint="client avatar"/>
                            <AvatarFallback>{getInitials(clientProfileForLawyerView.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xl font-semibold">{clientProfileForLawyerView.displayName}</p>
                            {clientProfileForLawyerView.createdAt && (
                                <p className="text-sm text-muted-foreground">Joined: {new Date(clientProfileForLawyerView.createdAt as any).toLocaleDateString()}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm">
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
        </div>
      </div>


      {isLawyerOwner && showUploadModal && (
         <DocumentUploadForm 
            caseId={caseId} 
            onClose={() => setShowUploadModal(false)}
            onDocumentUploaded={handleDocumentUploaded}
        />
      )}

      <AlertDialog open={!!docToDelete} onOpenChange={(isOpen) => !isOpen && setDocToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the document
                    <span className="font-bold"> "{docToDelete?.name}"</span> from the case.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive hover:bg-destructive/90">
                    Yes, delete document
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
