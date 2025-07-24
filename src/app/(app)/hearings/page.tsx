
'use client';

import { useEffect, useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Loader2, AlertTriangle, Eye, CheckCircle, Archive } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

function convertToTimestamp(date: any): Timestamp | null {
  if (date instanceof Timestamp) {
    return date;
  }
  if (date && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Timestamp(date.seconds, date.nanoseconds);
  }
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  return null;
}


export default function HearingsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [upcomingHearings, setUpcomingHearings] = useState<CaseFile[]>([]);
  const [pastHearings, setPastHearings] = useState<CaseFile[]>([]);
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
          q = query(collection(db, 'cases'), where('lawyerUid', '==', userProfile.uid));
        } else { // client
          q = query(collection(db, 'cases'), where('clientEmail', '==', userProfile.email));
        }
        
        const querySnapshot = await getDocs(q);
        const allUserCases: CaseFile[] = [];
        querySnapshot.forEach((doc) => {
          allUserCases.push({ id: doc.id, ...doc.data() } as CaseFile);
        });
        
        const now = Timestamp.now();
        const casesWithDates = allUserCases.map(c => ({
          ...c,
          hearingDate: convertToTimestamp(c.hearingDate)
        })).filter(c => c.hearingDate !== null);


        const futureHearings = casesWithDates
          .filter(c => (c.hearingDate as Timestamp).toMillis() >= now.toMillis())
          .sort((a, b) => (a.hearingDate as Timestamp).toMillis() - (b.hearingDate as Timestamp).toMillis());

        const previousHearings = casesWithDates
          .filter(c => (c.hearingDate as Timestamp).toMillis() < now.toMillis())
          .sort((a, b) => (b.hearingDate as Timestamp).toMillis() - (a.hearingDate as Timestamp).toMillis());

        setUpcomingHearings(futureHearings);
        setPastHearings(previousHearings);

      } catch (err: any) {
        console.error("Error fetching hearings:", err);
        setError("Failed to load hearings. Please try again.");
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

  const HearingListItem = ({ hearing }: { hearing: CaseFile }) => {
    const hearingDate = hearing.hearingDate ? (hearing.hearingDate as Timestamp).toDate() : null;
    
    return (
     <li className="p-4 rounded-md border hover:bg-accent/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
            <h3 className="text-lg font-semibold">{hearing.caseNumber} - {hearing.clientName}</h3>
            <p className="text-sm text-muted-foreground">Court: {hearing.court}</p>
        </div>
        <div className="text-sm text-right flex-shrink-0">
            <p className="font-medium text-primary">
                {hearingDate ? hearingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not set'}
            </p>
             <p className="text-muted-foreground">
                {hearingDate ? hearingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
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
   )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Hearings Schedule</h1>
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>

       {error && (
        <Card>
            <CardContent className="text-center py-10 rounded-md border border-dashed border-destructive/50 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-semibold">Error Loading Hearings</p>
                <p className="text-sm">{error}</p>
            </CardContent>
        </Card>
      )}

      {!error && (
        <div className="space-y-8">
            {/* Upcoming Hearings */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-6 w-6 text-primary" />
                    Upcoming Hearings
                </CardTitle>
                <CardDescription>
                    Your future court appearances and hearing details, sorted by the nearest date.
                </CardDescription>
                </CardHeader>
                <CardContent>
                {upcomingHearings.length === 0 ? (
                    <div className="text-center py-10 rounded-md border border-dashed">
                    <Image src="https://placehold.co/300x200.png" alt="No hearings scheduled" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="calendar empty"/>
                    <p className="text-lg font-semibold text-muted-foreground">No Upcoming Hearings</p>
                    <p className="text-sm text-muted-foreground">There are no hearings currently scheduled in the future.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {upcomingHearings.map((hearing) => <HearingListItem key={hearing.id} hearing={hearing} />)}
                    </ul>
                )}
                </CardContent>
            </Card>

            {/* Past Hearings */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Archive className="h-6 w-6 text-muted-foreground" />
                    Past Hearings
                </CardTitle>
                <CardDescription>
                    A record of your past court appearances, with the most recent listed first.
                </CardDescription>
                </CardHeader>
                <CardContent>
                {pastHearings.length === 0 ? (
                    <div className="text-center py-10 rounded-md border border-dashed">
                        <Image src="https://placehold.co/300x200.png" alt="No past hearings" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="archive empty"/>
                        <p className="text-lg font-semibold text-muted-foreground">No Past Hearings</p>
                        <p className="text-sm text-muted-foreground">There are no hearings recorded in the past.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {pastHearings.map((hearing) => <HearingListItem key={hearing.id} hearing={hearing} />)}
                    </ul>
                )}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
