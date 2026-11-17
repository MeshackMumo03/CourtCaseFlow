import { Briefcase, CalendarDays, FileText, PlusCircle, ShieldQuestion, UserCheck, UserCog, Users } from 'lucide-react';
import Link from 'next/link';

import { CaseStatusBadge } from '@/components/common/badges';
import { LocalTime } from '@/components/common/LocalTime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminStats } from '@/server/admin';
import { countDocumentsForUser, listCasesForUser } from '@/server/cases';
import { requirePageUser } from '@/server/session';

function StatCard({ title, value, hint, icon: Icon }: { title: string; value: number; hint: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requirePageUser();

  if (user.role === 'admin') {
    const stats = await getAdminStats();
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <UserCog className="h-8 w-8 text-primary" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Pending Verifications" value={stats.pending} hint="Lawyers awaiting approval" icon={ShieldQuestion} />
          <StatCard title="Total Users" value={stats.total} hint={`${stats.lawyers} lawyers, ${stats.clients} clients`} icon={Users} />
          <StatCard title="Total Cases" value={stats.totalCases} hint="Cases created on the platform" icon={Briefcase} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/verifications">
                <UserCheck className="mr-2 h-5 w-5" /> Review Pending Verifications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [cases, totalDocuments] = await Promise.all([listCasesForUser(user), countDocumentsForUser(user)]);
  const now = new Date();
  const activeCases = cases.filter((c) => c.status === 'active').length;
  const upcomingHearings = cases.filter((c) => c.hearingDate && c.hearingDate > now).length;
  const recent = cases.slice(0, 5);
  const isLawyer = user.role === 'lawyer';

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {isLawyer && (
          <Button asChild>
            <Link href="/cases/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Case
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user.name}!</CardTitle>
          <CardDescription>
            {isLawyer ? 'Manage your cases, documents, and hearings.' : 'View your cases and track their progress.'}
          </CardDescription>
        </CardHeader>
        {!isLawyer && !user.emailVerified && (
          <CardContent className="text-sm text-destructive">Verify your email address to see cases your lawyer has opened for you.</CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Active Cases" value={activeCases} hint="Cases currently active" icon={Briefcase} />
        <StatCard title="Upcoming Hearings" value={upcomingHearings} hint="Cases with a future hearing date" icon={CalendarDays} />
        <StatCard title="Documents" value={totalDocuments} hint="Uploaded across your cases" icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLawyer ? 'Recent Cases' : 'Your Cases'}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <ul className="space-y-3">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50">
                  <div>
                    <p className="font-semibold">
                      {c.caseNumber} - {c.clientName}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      Status: <CaseStatusBadge status={c.status} />
                    </p>
                    {c.hearingDate && (
                      <p className="text-sm text-muted-foreground">
                        Next hearing: <LocalTime value={c.hearingDate} />
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cases/${c.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isLawyer ? "You haven't created any cases yet." : 'No cases have been opened for you yet.'}
              </p>
              {isLawyer && (
                <Button asChild className="mt-4">
                  <Link href="/cases/create">Create Your First Case</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
