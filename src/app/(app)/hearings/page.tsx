
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Dummy data - replace with actual fetching logic
const upcomingHearings = [
  { id: 'h1', caseNumber: 'L-2023-001', clientName: 'Alice Wonderland', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), time: '10:00 AM', court: 'High Court, Room 3B' },
  { id: 'h2', caseNumber: 'C-2023-001', clientName: 'Self (Bob The Builder)', date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), time: '02:30 PM', court: 'District Court, Hall A' },
];

export default function HearingsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
  }, [userProfile, authLoading, router]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Hearings</h1>
        {/* Add button for lawyer to schedule new hearing if needed */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Hearings</CardTitle>
          <CardDescription>
            View your upcoming court appearances and hearing details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingHearings.length === 0 ? (
            <div className="text-center py-10">
              <Image src="https://placehold.co/300x200.png" alt="No hearings scheduled" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="calendar empty"/>
              <p className="text-muted-foreground">No hearings are currently scheduled.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {upcomingHearings.map((hearing) => (
                <li key={hearing.id} className="p-4 rounded-md border hover:bg-accent/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{hearing.caseNumber} - {hearing.clientName}</h3>
                    <span className="text-sm text-primary font-medium">{hearing.date.toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Time: {hearing.time}</p>
                  <p className="text-sm text-muted-foreground">Court: {hearing.court}</p>
                  {/* Add a link to case details if applicable */}
                  {/* <Button variant="link" size="sm" className="p-0 h-auto mt-1">View Case</Button> */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
       {/* Placeholder for past hearings or more features */}
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Past Hearings</CardTitle>
                 <CardDescription>Review records of past hearings.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">No past hearings recorded yet.</p>
                 <Image src="https://placehold.co/600x400.png" alt="Past hearings archive" width={600} height={400} className="mt-4 rounded-md opacity-50" data-ai-hint="archive document"/>
            </CardContent>
        </Card>
    </div>
  );
}
