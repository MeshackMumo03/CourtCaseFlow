
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, ShieldQuestion } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserVerificationStatusAction } from '@/actions/admin';

const ADMIN_EMAIL = 'admin@caselink.com'; // Hardcoded admin email for prototype

export default function AdminVerificationsPage() {
  const { userProfile: adminUserProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pendingLawyers, setPendingLawyers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({}); // For individual button loading states


  useEffect(() => {
    if (authLoading) return;

    if (!adminUserProfile) {
      router.replace('/login');
      return;
    }
    if (adminUserProfile.email !== ADMIN_EMAIL) {
      setError('Access Denied: You do not have permission to view this page.');
      setLoadingData(false);
      return;
    }

    const fetchPendingVerifications = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        // Fetch all users who are lawyers
        const q = query(usersRef, where('role', '==', 'lawyer'));
        const querySnapshot = await getDocs(q);
        
        const fetchedLawyers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLawyers.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        
        // Filter for those with pending LSK or Law Firm verification
        const lawyersToVerify = fetchedLawyers.filter(lawyer => 
            lawyer.lskVerificationStatus === 'pending_review' || 
            lawyer.lawFirmVerificationStatus === 'pending_review'
        );

        setPendingLawyers(lawyersToVerify);
      } catch (err) {
        console.error('Error fetching pending verifications:', err);
        setError('Failed to load users for verification.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchPendingVerifications();
  }, [adminUserProfile, authLoading, router]);

  const handleVerificationUpdate = async (
    userId: string, 
    verificationType: 'lsk' | 'lawFirm', 
    newStatus: 'verified' | 'rejected'
  ) => {
    const buttonKey = `${userId}-${verificationType}-${newStatus}`;
    setIsSubmitting(prev => ({ ...prev, [buttonKey]: true }));

    const result = await updateUserVerificationStatusAction(userId, verificationType, newStatus);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      // Refresh data by refetching or updating local state
      setPendingLawyers(prevLawyers => 
        prevLawyers.map(lawyer => {
          if (lawyer.uid === userId) {
            return {
              ...lawyer,
              ...(verificationType === 'lsk' && { lskVerificationStatus: newStatus }),
              ...(verificationType === 'lawFirm' && { lawFirmVerificationStatus: newStatus }),
            };
          }
          return lawyer;
        }).filter(lawyer => // Keep them in the list if another status is still pending
            lawyer.lskVerificationStatus === 'pending_review' || 
            lawyer.lawFirmVerificationStatus === 'pending_review'
        )
      );
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsSubmitting(prev => ({ ...prev, [buttonKey]: false }));
  };


  if (authLoading || loadingData) {
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
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Verifications</h1>
        <ShieldQuestion className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Lawyer Verifications</CardTitle>
          <CardDescription>Review and approve or reject LSK and Law Firm details submitted by lawyers.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLawyers.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending verifications at the moment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LSK Number</TableHead>
                  <TableHead>LSK Status</TableHead>
                  <TableHead>Law Firm Name</TableHead>
                  <TableHead>Firm Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLawyers.map((lawyer) => (
                  <TableRow key={lawyer.uid}>
                    <TableCell className="font-medium">{lawyer.displayName}</TableCell>
                    <TableCell>{lawyer.email}</TableCell>
                    <TableCell>{lawyer.lskRegistrationNumber || 'N/A'}</TableCell>
                    <TableCell>
                       <Badge variant={lawyer.lskVerificationStatus === 'pending_review' ? 'secondary' : 'default'} className="capitalize">
                        {lawyer.lskVerificationStatus?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{lawyer.lawFirmName || 'N/A'}</TableCell>
                     <TableCell>
                       <Badge variant={lawyer.lawFirmVerificationStatus === 'pending_review' ? 'secondary' : 'default'} className="capitalize">
                        {lawyer.lawFirmVerificationStatus?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-y-1 md:space-y-0 md:space-x-1">
                      {lawyer.lskVerificationStatus === 'pending_review' && (
                        <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lsk', 'verified')}
                            disabled={isSubmitting[`${lawyer.uid}-lsk-verified`]}
                            className="text-xs"
                          >
                            {isSubmitting[`${lawyer.uid}-lsk-verified`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />} Approve LSK
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lsk', 'rejected')}
                            disabled={isSubmitting[`${lawyer.uid}-lsk-rejected`]}
                            className="text-xs"
                          >
                             {isSubmitting[`${lawyer.uid}-lsk-rejected`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />} Reject LSK
                          </Button>
                        </div>
                      )}
                       {lawyer.lawFirmVerificationStatus === 'pending_review' && (
                        <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-1 mt-1 sm:mt-0">
                           <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lawFirm', 'verified')}
                            disabled={isSubmitting[`${lawyer.uid}-lawFirm-verified`]}
                            className="text-xs"
                          >
                            {isSubmitting[`${lawyer.uid}-lawFirm-verified`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />} Approve Firm
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lawFirm', 'rejected')}
                            disabled={isSubmitting[`${lawyer.uid}-lawFirm-rejected`]}
                            className="text-xs"
                          >
                             {isSubmitting[`${lawyer.uid}-lawFirm-rejected`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />} Reject Firm
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
