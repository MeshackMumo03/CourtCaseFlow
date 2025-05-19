
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function AllCasesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userProfile) {
      router.replace('/login');
      return;
    }
    if (userProfile.role !== 'lawyer') {
      setError('Access Denied: You do not have permission to view this page.');
      // Or redirect to dashboard: router.replace('/dashboard');
      setLoadingCases(false);
      return;
    }

    const fetchCases = async () => {
      if (!userProfile) return;
      setLoadingCases(true);
      setError(null);
      try {
        const casesRef = collection(db, 'cases');
        const q = query(casesRef, where('lawyerUid', '==', userProfile.uid));
        const querySnapshot = await getDocs(q);
        const fetchedCases: CaseFile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedCases.push({ id: doc.id, ...doc.data() } as CaseFile);
        });
        setCases(fetchedCases.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis())); // Sort by newest first
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError('Failed to load cases.');
      } finally {
        setLoadingCases(false);
      }
    };

    fetchCases();
  }, [userProfile, authLoading, router]);

  if (authLoading || loadingCases) {
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
        <h1 className="text-3xl font-bold tracking-tight">All Cases</h1>
        <Button asChild>
          <Link href="/cases/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Case
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Cases</CardTitle>
          <CardDescription>Manage all cases assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
             <div className="text-center py-10">
              <Image src="https://placehold.co/300x200.png" alt="No cases illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="empty state legal"/>
              <p className="text-muted-foreground">You haven&apos;t created or been assigned any cases yet.</p>
              <Button asChild className="mt-4">
                <Link href="/cases/create">Create Your First Case</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Hearing Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.caseNumber}</TableCell>
                    <TableCell>{caseItem.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{caseItem.court}</TableCell>
                    <TableCell>
                      {caseItem.hearingDate instanceof Timestamp ? caseItem.hearingDate.toDate().toLocaleDateString() : caseItem.hearingDate ? new Date(caseItem.hearingDate as any).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/cases/${caseItem.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                      </Button>
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
