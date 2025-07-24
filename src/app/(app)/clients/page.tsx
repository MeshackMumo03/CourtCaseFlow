
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientInfo {
  name: string;
  email: string;
  caseCount: number;
}

export default function ClientsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userProfile) {
      router.replace('/login');
      return;
    }
    if (userProfile.role !== 'lawyer') {
      setError('Access Denied: You do not have permission to view this page.');
      setLoadingClients(false);
      return;
    }

    const fetchClients = async () => {
      if (!userProfile) return;
      setLoadingClients(true);
      setError(null);
      try {
        const casesRef = collection(db, 'cases');
        const q = query(casesRef, where('lawyerUid', '==', userProfile.uid));
        const querySnapshot = await getDocs(q);
        
        const clientMap = new Map<string, ClientInfo>();

        querySnapshot.forEach((doc) => {
          const caseData = doc.data() as CaseFile;
          if (caseData.clientEmail) {
            if (clientMap.has(caseData.clientEmail)) {
              clientMap.get(caseData.clientEmail)!.caseCount++;
            } else {
              clientMap.set(caseData.clientEmail, {
                email: caseData.clientEmail,
                name: caseData.clientName,
                caseCount: 1,
              });
            }
          }
        });

        const aggregatedClients = Array.from(clientMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        setClients(aggregatedClients);

      } catch (err) {
        console.error('Error fetching clients from cases:', err);
        setError('Failed to load client list.');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [userProfile, authLoading, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (authLoading || loadingClients) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <span className="ml-2">Loading clients...</span>
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
        <h1 className="text-3xl font-bold tracking-tight">Your Clients</h1>
        <Users className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>A list of all clients you have created cases for.</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
             <div className="text-center py-10 rounded-md border border-dashed">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No Clients Found</p>
                <p className="text-sm text-muted-foreground">Clients will appear here once you create cases for them.</p>
                <Button asChild className="mt-4">
                    <Link href="/cases/create">Create a Case</Link>
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active Cases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.email}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(client.name)}`} data-ai-hint="person avatar"/>
                                <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                            </Avatar>
                            <span>{client.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.caseCount}</Badge>
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
