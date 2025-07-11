
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, ShieldQuestion, Search, UserCheck, UserX, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserVerificationStatusAction } from '@/actions/admin';

const ADMIN_EMAIL = 'admin@caselink.com';

export default function AdminVerificationsPage() {
  const { userProfile: adminUserProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allLawyers, setAllLawyers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const fetchAllLawyers = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'lawyer'));
      const querySnapshot = await getDocs(q);
      
      const fetchedLawyers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLawyers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      setAllLawyers(fetchedLawyers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));

    } catch (err) {
      console.error('Error fetching lawyers:', err);
      setError('Failed to load lawyers for verification.');
      toast({ variant: 'destructive', title: 'Loading Error', description: 'Could not load lawyer data.' });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!adminUserProfile) {
      router.replace('/login');
      return;
    }

    if (adminUserProfile.email !== ADMIN_EMAIL) {
      setError(`Access Denied: User ${adminUserProfile.email} is not authorized for admin functions.`);
      setLoadingData(false);
      return;
    }
    
    fetchAllLawyers();

  }, [adminUserProfile, authLoading, router, fetchAllLawyers]);

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
      // Update local state to reflect the change
      setAllLawyers(prevLawyers => 
        prevLawyers.map(lawyer => {
          if (lawyer.uid === userId) {
            return {
              ...lawyer,
              ...(verificationType === 'lsk' && { lskVerificationStatus: newStatus }),
              ...(verificationType === 'lawFirm' && { lawFirmVerificationStatus: newStatus }),
            };
          }
          return lawyer;
        })
      );
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsSubmitting(prev => ({ ...prev, [buttonKey]: false }));
  };


  if (authLoading || (adminUserProfile?.email === ADMIN_EMAIL && loadingData)) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading verification data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }
  
  if (adminUserProfile?.email !== ADMIN_EMAIL) {
     return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You do not have permission to view this page. Ensure you are logged in with the admin account ({ADMIN_EMAIL}).</p>
         <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Lawyer Verification Management</h1>
        <ShieldQuestion className="h-8 w-8 text-primary" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Lawyers</CardTitle>
          <CardDescription>Review and manage the verification status of all lawyers on the platform. Logged in as: {adminUserProfile.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {allLawyers.length === 0 ? (
            <div className="text-center py-10 rounded-md border border-dashed">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No Lawyers Found</p>
              <p className="text-sm text-muted-foreground">There are no users registered as lawyers on the platform yet.</p>
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
                {allLawyers.map((lawyer) => (
                  <TableRow key={lawyer.uid}>
                    <TableCell className="font-medium">{lawyer.displayName || 'N/A'}</TableCell>
                    <TableCell>{lawyer.email}</TableCell>
                    <TableCell>{lawyer.lskRegistrationNumber || 'Not Provided'}</TableCell>
                    <TableCell>
                       <Badge 
                          variant={
                            lawyer.lskVerificationStatus === 'pending_review' ? 'secondary' : 
                            lawyer.lskVerificationStatus === 'verified' ? 'default' : 
                            lawyer.lskVerificationStatus === 'rejected' ? 'destructive' : 
                            'outline'
                          } 
                          className="capitalize"
                        >
                        {lawyer.lskVerificationStatus?.replace('_', ' ') || 'Unverified'}
                      </Badge>
                    </TableCell>
                    <TableCell>{lawyer.lawFirmName || 'Not Provided'}</TableCell>
                     <TableCell>
                       <Badge 
                          variant={
                            lawyer.lawFirmVerificationStatus === 'pending_review' ? 'secondary' : 
                            lawyer.lawFirmVerificationStatus === 'verified' ? 'default' :
                            lawyer.lawFirmVerificationStatus === 'rejected' ? 'destructive' :
                            'outline'
                          } 
                          className="capitalize"
                        >
                        {lawyer.lawFirmVerificationStatus?.replace('_', ' ') || 'Unverified'}
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
                            {isSubmitting[`${lawyer.uid}-lsk-verified`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3 mr-1" />} Approve LSK
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lsk', 'rejected')}
                            disabled={isSubmitting[`${lawyer.uid}-lsk-rejected`]}
                            className="text-xs"
                          >
                             {isSubmitting[`${lawyer.uid}-lsk-rejected`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3 mr-1" />} Reject LSK
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
                            {isSubmitting[`${lawyer.uid}-lawFirm-verified`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3 mr-1" />} Approve Firm
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleVerificationUpdate(lawyer.uid, 'lawFirm', 'rejected')}
                            disabled={isSubmitting[`${lawyer.uid}-lawFirm-rejected`]}
                            className="text-xs"
                          >
                             {isSubmitting[`${lawy.uid}-lawFirm-rejected`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3 mr-1" />} Reject Firm
                          </Button>
                        </div>
                      )}
                       {(lawyer.lskVerificationStatus !== 'pending_review' && lawyer.lawFirmVerificationStatus !== 'pending_review') &&
                        <span className="text-xs text-muted-foreground italic">No action needed</span>
                       }
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

    