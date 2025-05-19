'use client';
import { CaseForm } from '@/components/cases/CaseForm';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function CreateCasePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!userProfile || userProfile.role !== 'lawyer')) {
      // Redirect if not a lawyer or not logged in
      router.replace('/dashboard'); 
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile || userProfile.role !== 'lawyer') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Case</h1>
      <CaseForm />
    </div>
  );
}
