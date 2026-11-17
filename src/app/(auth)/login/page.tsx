import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { googleEnabled } from '@/lib/env';
import { getSession } from '@/server/session';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect('/dashboard');
  const { next } = await searchParams;
  return <LoginForm googleEnabled={googleEnabled} next={next} />;
}
