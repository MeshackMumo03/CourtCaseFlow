
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, CaseFile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, UserCircle2, Mail, Phone, ArrowLeft, Briefcase, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientEmail = decodeURIComponent(params.clientEmail as string);

  const [client, setClient] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userProfile || !clientEmail) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch client profile
      const clientQuery = query(collection(db, 'users'), where('email', '==', clientEmail), where('role', '==', 'client'));
      const clientSnapshot = await getDocs(clientQuery);

      if (clientSnapshot.empty) {
        throw new Error('Client profile not found.');
      }
      const clientData = clientSnapshot.docs[0].data() as UserProfile;
      setClient({ ...clientData, uid: clientSnapshot.docs[0].id });

      // 2. Fetch cases for this client managed by the current lawyer
      const casesQuery = query(
        collection(db, 'cases'),
        where('clientEmail', '==', clientEmail),
        where('lawyerUid', '==', userProfile.uid)
      );
      const casesSnapshot = await getDocs(casesQuery);
      const fetchedCases = casesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseFile))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)); // Newest first
      
      setCases(fetchedCases);

    } catch (err: any) {
      console.error("Error fetching client details:", err);
      setError(err.message || "Failed to load client details.");
    } finally {
      setLoading(false);
    }
  }, [clientEmail, userProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      router.replace('/login');
      return;
    }
     if (userProfile.role !== 'lawyer') {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [authLoading, userProfile, router, fetchData]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading client details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
        <div className="flex flex-1 items-center justify-center p-6">Client data not available.</div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients List
        </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-6 w-6 text-primary" /> Client Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={client.photoURL || `https://placehold.co/100x100.png?text=${getInitials(client.displayName)}`} alt={client.displayName || "Client"} data-ai-hint="client avatar"/>
                        <AvatarFallback>{getInitials(client.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-2xl font-semibold">{client.displayName}</p>
                        {client.createdAt instanceof Timestamp && (
                            <p className="text-sm text-muted-foreground">Joined: {client.createdAt.toDate().toLocaleDateString()}</p>
                        )}
                    </div>
              </div>
               <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm pt-4 border-t">
                    {client.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a href={`mailto:${client.email}`} className="hover:underline break-all">{client.email}</a>
                        </div>
                    )}
                    {client.phoneNumber && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{client.phoneNumber}</span>
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" /> Associated Cases
              </CardTitle>
              <CardDescription>
                List of all cases for {client.displayName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <div className="text-center py-10 rounded-md border border-dashed">
                  <p className="text-muted-foreground">No cases found for this client.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Court</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell className="font-medium">{caseItem.caseNumber}</TableCell>
                        <TableCell>
                          <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                            {caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{caseItem.court}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/cases/${caseItem.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View Case
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
      </div>
    </div>
  );
}

