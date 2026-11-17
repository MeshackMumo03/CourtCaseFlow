import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/SignupForm';
import { googleEnabled } from '@/lib/env';
import { getSession } from '@/server/session';

export default async function SignupPage() {
  if (await getSession()) redirect('/dashboard');
  return <SignupForm googleEnabled={googleEnabled} />;
}
