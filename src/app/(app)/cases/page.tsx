import { Briefcase, Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { CaseStatusBadge } from '@/components/common/badges';
import { LocalTime } from '@/components/common/LocalTime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listCasesForUser } from '@/server/cases';
import { requirePageUser } from '@/server/session';

export default async function AllCasesPage() {
  const user = await requirePageUser(['lawyer']);
  const cases = await listCasesForUser(user);

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
          <CardDescription>All cases you manage.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <div className="py-10 text-center">
              <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">You haven&apos;t created any cases yet.</p>
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
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.caseNumber}</TableCell>
                    <TableCell>{c.clientName}</TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>{c.court}</TableCell>
                    <TableCell>{c.hearingDate ? <LocalTime value={c.hearingDate} /> : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/cases/${c.id}`}>
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
