import { Archive, CalendarDays, Eye } from 'lucide-react';
import Link from 'next/link';

import { LocalTime } from '@/components/common/LocalTime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listCasesForUser } from '@/server/cases';
import { requirePageUser } from '@/server/session';
import type { CaseFile } from '@/types';

function HearingItem({ hearing }: { hearing: CaseFile & { hearingDate: Date } }) {
  return (
    <li className="rounded-md border p-4 transition-colors hover:bg-accent/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {hearing.caseNumber} - {hearing.clientName}
          </h3>
          <p className="text-sm text-muted-foreground">Court: {hearing.court}</p>
        </div>
        <p className="flex-shrink-0 text-right text-sm font-medium text-primary">
          <LocalTime value={hearing.hearingDate} format="long" />
        </p>
      </div>
      <div className="mt-3 flex justify-end border-t pt-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/cases/${hearing.id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Case
          </Link>
        </Button>
      </div>
    </li>
  );
}

function Section({ title, description, icon: Icon, items, empty }: { title: string; description: string; icon: React.ElementType; items: (CaseFile & { hearingDate: Date })[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground">{empty}</div>
        ) : (
          <ul className="space-y-4">
            {items.map((h) => (
              <HearingItem key={h.id} hearing={h} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function splitHearings(cases: CaseFile[]) {
  const now = Date.now();
  const withDates = cases.filter((c): c is CaseFile & { hearingDate: Date } => c.hearingDate !== null);
  return {
    upcoming: withDates.filter((c) => c.hearingDate.getTime() >= now).sort((a, b) => a.hearingDate.getTime() - b.hearingDate.getTime()),
    past: withDates.filter((c) => c.hearingDate.getTime() < now).sort((a, b) => b.hearingDate.getTime() - a.hearingDate.getTime()),
  };
}

export default async function HearingsPage() {
  const user = await requirePageUser(['lawyer', 'client']);
  const { upcoming, past } = splitHearings(await listCasesForUser(user));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Hearings Schedule</h1>
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>
      <Section title="Upcoming Hearings" description="Sorted by the nearest date." icon={CalendarDays} items={upcoming} empty="No upcoming hearings." />
      <Section title="Past Hearings" description="Most recent first." icon={Archive} items={past} empty="No past hearings." />
    </div>
  );
}
