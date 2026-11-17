import { ArrowLeft, Briefcase, Building, CalendarCheck2, Edit3, Mail, MapPin, Phone, User, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CommentsPanel } from '@/components/cases/CommentsPanel';
import { CaseStatusBadge, VerificationBadge } from '@/components/common/badges';
import { LocalTime } from '@/components/common/LocalTime';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import { getCaseAccess, getClientProfileByEmail, getProfileById, listComments, listDocuments } from '@/server/cases';
import { requirePageUser } from '@/server/session';
import type { PublicProfile } from '@/types';

function ContactLines({ profile }: { profile: PublicProfile }) {
  return (
    <div className="grid grid-cols-1 gap-2 text-sm">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <a href={`mailto:${profile.email}`} className="break-all hover:underline">
          {profile.email}
        </a>
      </div>
      {profile.phoneNumber && (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span>{profile.phoneNumber}</span>
        </div>
      )}
    </div>
  );
}

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const user = await requirePageUser(['lawyer', 'client']);
  const access = await getCaseAccess(caseId, user);
  if (!access) notFound();

  const { caseFile, isOwner } = access;
  const [documents, comments, lawyer, client] = await Promise.all([
    listDocuments(caseId),
    listComments(caseId),
    getProfileById(caseFile.lawyerId),
    isOwner ? getClientProfileByEmail(caseFile.clientEmail) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 p-1 md:p-4 lg:p-6">
      <Button variant="outline" asChild className="mb-4 print:hidden">
        <Link href={isOwner ? '/cases' : '/dashboard'}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-3xl">
                    <Briefcase className="h-7 w-7 text-primary" /> {caseFile.caseNumber}
                  </CardTitle>
                  <CardDescription>
                    Client: {caseFile.clientName} ({caseFile.clientEmail})
                  </CardDescription>
                </div>
                {isOwner && (
                  <Button asChild variant="outline" className="print:hidden">
                    <Link href={`/cases/${caseId}/edit`}>
                      <Edit3 className="mr-2 h-4 w-4" /> Edit Case
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <strong className="font-medium text-muted-foreground">Court:</strong> {caseFile.court}
              </div>
              <div className="flex items-center gap-2">
                <strong className="font-medium text-muted-foreground">Status:</strong> <CaseStatusBadge status={caseFile.status} />
              </div>
              {caseFile.hearingDate && (
                <div className="flex items-center gap-1">
                  <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                  <strong className="font-medium text-muted-foreground">Hearing:</strong>{' '}
                  <LocalTime value={caseFile.hearingDate} format="datetime" />
                </div>
              )}
              <div className="md:col-span-2">
                <strong className="font-medium text-muted-foreground">Description:</strong>
                <p className="mt-1 whitespace-pre-line text-sm">{caseFile.description || 'No description provided.'}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                <strong className="font-medium">Created:</strong> <LocalTime value={caseFile.createdAt} format="datetime" />
              </div>
              <div className="text-xs text-muted-foreground">
                <strong className="font-medium">Last Updated:</strong> <LocalTime value={caseFile.updatedAt} format="datetime" />
              </div>
            </CardContent>
          </Card>

          <DocumentsPanel caseId={caseId} documents={documents} canEdit={isOwner} />
          <CommentsPanel caseId={caseId} initialComments={comments} currentUserId={user.id} currentRole={user.role as 'lawyer' | 'client'} />
        </div>

        <div className="space-y-6 xl:col-span-1">
          {lawyer && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  {isOwner ? 'Assigned Lawyer' : "Your Lawyer's Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    {lawyer.image && <AvatarImage src={lawyer.image} alt={lawyer.name} />}
                    <AvatarFallback>{getInitials(lawyer.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xl font-semibold">{lawyer.name}</p>
                    {lawyer.lskRegistrationNumber && <p className="text-sm text-muted-foreground">LSK No: {lawyer.lskRegistrationNumber}</p>}
                  </div>
                </div>
                <ContactLines profile={lawyer} />
                {lawyer.lawFirmName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span>{lawyer.lawFirmName}</span>
                  </div>
                )}
                {lawyer.lawFirmAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="whitespace-pre-line">{lawyer.lawFirmAddress}</span>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                  {lawyer.lskRegistrationNumber && <VerificationBadge label="LSK" status={lawyer.lskVerificationStatus} />}
                  {(lawyer.lawFirmName || lawyer.lawFirmAddress) && <VerificationBadge label="Firm" status={lawyer.lawFirmVerificationStatus} />}
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle2 className="h-6 w-6 text-primary" /> Client Account
                </CardTitle>
                <CardDescription>
                  {client ? 'This client has a verified CourtCaseFlow account.' : 'No verified account uses this email yet. The client will see the case after they sign up with it.'}
                </CardDescription>
              </CardHeader>
              {client && (
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      {client.image && <AvatarImage src={client.image} alt={client.name} />}
                      <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xl font-semibold">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined <LocalTime value={client.createdAt} />
                      </p>
                    </div>
                  </div>
                  <ContactLines profile={client} />
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
