import { Eye, Users } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInitials } from '@/lib/utils';
import { listClientsForLawyer } from '@/server/cases';
import { requirePageUser } from '@/server/session';

export default async function ClientsPage() {
  const user = await requirePageUser(['lawyer']);
  const clients = await listClientsForLawyer(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Clients</h1>
        <Users className="h-8 w-8 text-primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Clients you have opened cases for.</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-semibold text-muted-foreground">No Clients Yet</p>
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
                  <TableHead>Cases</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.email}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span>{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.caseCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/clients/${encodeURIComponent(c.email)}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
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
