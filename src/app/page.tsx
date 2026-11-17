import { redirect } from 'next/navigation';
import { getSession } from '@/server/session';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(session.user.onboarded ? '/dashboard' : '/onboarding');
}
