'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signOut } from '@/lib/auth-client';

export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();
  return async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Logout failed' });
      return;
    }
    router.replace('/login');
    router.refresh();
  };
}
