"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Briefcase, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Dummy data for cases - replace with actual Firestore fetching
const lawyerCases = [
  { id: "1", caseNumber: "L-2023-001", clientName: "Alice Wonderland", status: "active", hearingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  { id: "2", caseNumber: "L-2023-002", clientName: "Bob The Builder", status: "pending" },
  { id: "3", caseNumber: "L-2022-050", clientName: "Charlie Brown", status: "closed", hearingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
];

const clientCases = [
  { id: "1", caseNumber: "C-2023-001", clientName: "Self", status: "active", lawyerName: "John Doe", hearingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
];

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>User profile not found. Please try logging in again.</p>
      </div>
    );
  }

  const upcomingHearings = (userProfile.role === 'lawyer' ? lawyerCases : clientCases)
    .filter(c => c.hearingDate && c.hearingDate > new Date())
    .sort((a,b) => a.hearingDate!.getTime() - b.hearingDate!.getTime());

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {userProfile.role === "lawyer" && (
          <Button asChild>
            <Link href="/cases/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Case
            </Link>
          </Button>
        )}
      </div>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {userProfile.displayName}!</CardTitle>
          <CardDescription>
            {userProfile.role === "lawyer"
              ? "Manage your cases, documents, and hearings efficiently."
              : "View your assigned cases and track their progress."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overview Stats (Example) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile.role === 'lawyer' ? lawyerCases.filter(c => c.status === 'active').length : clientCases.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently managed active cases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Hearings</CardTitle>
            <Eye className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{upcomingHearings.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled in the next 30 days
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">15</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">
              Documents uploaded across all cases
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Case List Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{userProfile.role === "lawyer" ? "Recent Cases" : "Your Cases"}</CardTitle>
          <CardDescription>A quick overview of your cases.</CardDescription>
        </CardHeader>
        <CardContent>
          {(userProfile.role === 'lawyer' ? lawyerCases.slice(0,3) : clientCases.slice(0,3)).length > 0 ? (
            <ul className="space-y-3">
              {(userProfile.role === 'lawyer' ? lawyerCases.slice(0,3) : clientCases.slice(0,3)).map((caseItem) => (
                <li key={caseItem.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50">
                  <div>
                    <p className="font-semibold">{caseItem.caseNumber} - {caseItem.clientName}</p>
                    <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{caseItem.status}</span></p>
                    {caseItem.hearingDate && <p className="text-sm text-muted-foreground">Next Hearing: {caseItem.hearingDate.toLocaleDateString()}</p>}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cases/${caseItem.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Image src="https://placehold.co/300x200.png" alt="No cases illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="empty state document"/>
              <p className="text-muted-foreground">
                {userProfile.role === "lawyer" ? "You haven't created any cases yet." : "No cases have been assigned to you yet."}
              </p>
              {userProfile.role === "lawyer" && (
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

function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}
