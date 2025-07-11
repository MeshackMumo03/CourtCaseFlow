
'use client';
import { CaseForm } from '@/components/cases/CaseForm';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

const ADMIN_EMAIL = 'admin@caselink.com';

export default function CreateCasePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Pick<UserProfile, 'uid' | 'displayName' | 'email'>[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    if (!loading && (!userProfile || userProfile.role !== 'lawyer')) {
      // Redirect if not a lawyer or not logged in
      router.replace('/dashboard'); 
    }
    
    async function fetchClients() {
      if (userProfile?.role === 'lawyer') {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'client'));
          const querySnapshot = await getDocs(q);
          const clientList = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                uid: doc.id,
                displayName: data.displayName || 'Unnamed Client',
                email: data.email || ''
                };
            })
            .filter(client => client.email !== ADMIN_EMAIL); // Explicitly filter out the admin
            
          setClients(clientList);
        } catch (error) {
          console.error("Error fetching clients:", error);
          // Handle error, maybe show a toast
        } finally {
          setLoadingClients(false);
        }
      } else {
        setLoadingClients(false);
      }
    }

    if (!loading && userProfile) {
      fetchClients();
    }

  }, [userProfile, loading, router]);

  if (loading || loadingClients || !userProfile || userProfile.role !== 'lawyer') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Case</h1>
      <CaseForm clients={clients} />
    </div>
  );
}
