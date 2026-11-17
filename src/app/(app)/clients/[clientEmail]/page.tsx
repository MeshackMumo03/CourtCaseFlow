import { ArrowLeft, Briefcase, Eye, Mail, Phone, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CaseStatusBadge } from '@/components/common/badges';
import { LocalTime } from '@/components/common/LocalTime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInitials } from '@/lib/utils';
import { getClientProfileByEmail, listCasesForLawyerAndClient } from '@/server/cases';
import { requirePageUser } from '@/server/session';

export default async function ClientDetailPage({ params }: { params: Promise<{ clientEmail: string }> }) {
  const { clientEmail: raw } = await params;
  const user = await requirePageUser(['lawyer']);
  const clientEmail = decodeURIComponent(raw);

  // A lawyer can only look up clients they already have cases with.
  const cases = await listCasesForLawyerAndClient(user.id, clientEmail);
  if (cases.length === 0) notFound();
  const profile = await getClientProfileByEmail(clientEmail);
  const name = profile?.name ?? cases[0].clientName;

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/clients">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Link>
      </Button>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-6 w-6 text-primary" /> Client Profile
            </CardTitle>
            {!profile && <CardDescription>This client hasn&apos;t created a verified account yet.</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profile?.image && <AvatarImage src={profile.image} alt={name} />}
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-2xl font-semibold">{name}</p>
                {profile && (
                  <p className="text-sm text-muted-foreground">
                    Joined <LocalTime value={profile.createdAt} />
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 border-t pt-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <a href={`mailto:${clientEmail}`} className="break-all hover:underline">
                  {clientEmail}
                </a>
              </div>
              {profile?.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>{profile.phoneNumber}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.caseNumber}</TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>{c.court}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/cases/${c.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Case
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
