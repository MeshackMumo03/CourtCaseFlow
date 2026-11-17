import { ShieldQuestion, Users } from 'lucide-react';

import { VerificationActions } from '@/components/admin/VerificationActions';
import { VerificationBadge } from '@/components/common/badges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listLawyers } from '@/server/admin';
import { requirePageUser } from '@/server/session';

export default async function AdminVerificationsPage() {
  await requirePageUser(['admin']);
  const lawyers = await listLawyers();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Lawyer Verification Management</h1>
        <ShieldQuestion className="h-8 w-8 text-primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Lawyers</CardTitle>
          <CardDescription>Lawyers waiting for review are listed first.</CardDescription>
        </CardHeader>
        <CardContent>
          {lawyers.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-semibold text-muted-foreground">No lawyers registered yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LSK Number</TableHead>
                  <TableHead>Law Firm</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lawyers.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.email}</TableCell>
                    <TableCell>{l.lskRegistrationNumber || 'Not provided'}</TableCell>
                    <TableCell>{l.lawFirmName || 'Not provided'}</TableCell>
                    <TableCell className="space-y-1">
                      <VerificationBadge label="LSK" status={l.lskVerificationStatus} />
                      <VerificationBadge label="Firm" status={l.lawFirmVerificationStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <VerificationActions
                        userId={l.id}
                        lskPending={l.lskVerificationStatus === 'pending_review'}
                        firmPending={l.lawFirmVerificationStatus === 'pending_review'}
                      />
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
