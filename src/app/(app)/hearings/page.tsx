
'use client';

import { useEffect, useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Loader2, AlertTriangle, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HearingsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [upcomingHearings, setUpcomingHearings] = useState<CaseFile[]>([]);
  const [loadingHearings, setLoadingHearings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userProfile) {
      router.replace('/login');
      return;
    }

    const fetchHearings = async () => {
      setLoadingHearings(true);
      setError(null);
      try {
        let q;
        if (userProfile.role === 'lawyer') {
          q = query(collection(db, 'cases'), where('lawyerUid', '==', userProfile.uid), where('hearingDate', '>=', Timestamp.now()), orderBy('hearingDate', 'asc'));
        } else { // client
          q = query(collection(db, 'cases'), where('clientEmail', '==', userProfile.email), where('hearingDate', '>=', Timestamp.now()), orderBy('hearingDate', 'asc'));
        }
        
        const querySnapshot = await getDocs(q);
        const fetchedHearings: CaseFile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedHearings.push({ id: doc.id, ...doc.data() } as CaseFile);
        });
        
        setUpcomingHearings(fetchedHearings);

      } catch (err: any) {
        console.error("Error fetching hearings:", err);
        setError("Failed to load upcoming hearings. This may be due to a missing database index. Check the browser console for a link to create it.");
      } finally {
        setLoadingHearings(false);
      }
    };

    fetchHearings();

  }, [userProfile, authLoading, router]);


  if (authLoading || loadingHearings) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading hearings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Hearings</h1>
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Hearings</CardTitle>
          <CardDescription>
            View your upcoming court appearances and hearing details, sorted by the nearest date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-10 rounded-md border border-dashed border-destructive/50 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-semibold">Error Loading Hearings</p>
                <p className="text-sm">{error}</p>
            </div>
          )}
          {!error && upcomingHearings.length === 0 && (
            <div className="text-center py-10 rounded-md border border-dashed">
              <Image src="https://placehold.co/300x200.png" alt="No hearings scheduled" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="calendar empty"/>
              <p className="text-lg font-semibold text-muted-foreground">No Upcoming Hearings</p>
              <p className="text-sm text-muted-foreground">There are no hearings currently scheduled in the future.</p>
            </div>
          )}
          {!error && upcomingHearings.length > 0 && (
            <ul className="space-y-4">
              {upcomingHearings.map((hearing) => (
                <li key={hearing.id} className="p-4 rounded-md border hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h3 className="text-lg font-semibold">{hearing.caseNumber} - {hearing.clientName}</h3>
                        <p className="text-sm text-muted-foreground">Court: {hearing.court}</p>
                    </div>
                    <div className="text-sm text-right">
                        <p className="font-medium text-primary">
                            {hearing.hearingDate instanceof Timestamp ? hearing.hearingDate.toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not set'}
                        </p>
                         <p className="text-muted-foreground">
                            {hearing.hearingDate instanceof Timestamp ? hearing.hearingDate.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end">
                     <Button variant="outline" size="sm" asChild>
                        <Link href={`/cases/${hearing.id}`}>
                            <Eye className="mr-2 h-4 w-4"/> View Case
                        </Link>
                     </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
