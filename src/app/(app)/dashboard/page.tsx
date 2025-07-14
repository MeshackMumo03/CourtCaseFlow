
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Briefcase, Eye, Loader2, Users, UserCheck, ShieldQuestion, UserCog, Building, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile, UserProfile } from '@/types';
import Image from "next/image";

const ADMIN_EMAIL = 'admin@caselink.com';

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const isAdmin = userProfile?.email === ADMIN_EMAIL;

  const fetchLawyerClientData = useCallback(async () => {
    if (!userProfile) return;
    setDataLoading(true);
    try {
      let q;
      if (userProfile.role === 'lawyer') {
        q = query(collection(db, 'cases'), where('lawyerUid', '==', userProfile.uid), orderBy('createdAt', 'desc'));
      } else { // client
        // Removed orderBy to prevent index error. Sorting will be done client-side.
        q = query(collection(db, 'cases'), where('clientEmail', '==', userProfile.email));
      }
      const querySnapshot = await getDocs(q);
      const cases: CaseFile[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseFile));
      
      // Sort cases by creation date descending (newest first)
      cases.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });


      const activeCases = cases.filter(c => c.status === 'active').length;
      const upcomingHearings = cases.filter(c => c.hearingDate && c.hearingDate.toMillis() > Date.now()).length;
      const totalDocuments = (await Promise.all(cases.map(c => getDocs(collection(db, 'cases', c.id, 'documents'))))).reduce((acc, snap) => acc + snap.size, 0);

      setDashboardData({
        cases: cases.slice(0, 5),
        stats: { activeCases, upcomingHearings, totalDocuments }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData({ cases: [], stats: { activeCases: 0, upcomingHearings: 0, totalDocuments: 0 } });
    } finally {
      setDataLoading(false);
    }
  }, [userProfile]);

  const fetchAdminData = useCallback(async () => {
    setDataLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
      
      const totalUsers = allUsers.length;
      const totalLawyers = allUsers.filter(u => u.role === 'lawyer').length;
      const totalClients = allUsers.filter(u => u.role === 'client').length;
      
      const pendingLawyers = allUsers.filter(u => u.role === 'lawyer' && (u.lskVerificationStatus === 'pending_review' || u.lawFirmVerificationStatus === 'pending_review')).length;
      
      const casesSnapshot = await getDocs(collection(db, 'cases'));
      const totalCases = casesSnapshot.size;

      setDashboardData({
        stats: { totalUsers, totalLawyers, totalClients, pendingVerifications: pendingLawyers, totalCases }
      });

    } catch (error) {
      console.error("Error fetching admin data:", error);
      setDashboardData({ stats: { totalUsers: 0, totalLawyers: 0, totalClients: 0, pendingVerifications: 0, totalCases: 0 } });
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && userProfile) {
      if (isAdmin) {
        fetchAdminData();
      } else {
        fetchLawyerClientData();
      }
    }
  }, [userProfile, loading, isAdmin, fetchAdminData, fetchLawyerClientData]);

  if (loading || dataLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <span className="ml-2">Loading Dashboard...</span>
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
  
  // ADMIN DASHBOARD VIEW
  if (isAdmin) {
    const { stats } = dashboardData;
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <UserCog className="h-8 w-8 text-primary" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome, Admin!</CardTitle>
            <CardDescription>
              Here's a high-level overview of the CourtCaseFlow platform.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Admin Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
              <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
              <p className="text-xs text-muted-foreground">Lawyers awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{stats.totalLawyers} Lawyers, {stats.totalClients} Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCases}</div>
              <p className="text-xs text-muted-foreground">Cases created on the platform</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Quick Actions */}
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Navigate to key administrative areas.</CardDescription>
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

  // LAWYER & CLIENT DASHBOARD VIEW
  const { cases, stats } = dashboardData;
  const upcomingHearings = cases.filter((c: CaseFile) => c.hearingDate && c.hearingDate.toMillis() > Date.now());

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCases}</div>
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
              Cases with a scheduled hearing date
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Uploaded across all your cases
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{userProfile.role === "lawyer" ? "Recent Cases" : "Your Cases"}</CardTitle>
          <CardDescription>A quick overview of your most recently updated cases.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length > 0 ? (
            <ul className="space-y-3">
              {cases.map((caseItem: CaseFile) => (
                <li key={caseItem.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50">
                  <div>
                    <p className="font-semibold">{caseItem.caseNumber} - {caseItem.clientName}</p>
                    <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{caseItem.status}</span></p>
                    {caseItem.hearingDate && <p className="text-sm text-muted-foreground">Next Hearing: {caseItem.hearingDate.toDate().toLocaleDateString()}</p>}
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
