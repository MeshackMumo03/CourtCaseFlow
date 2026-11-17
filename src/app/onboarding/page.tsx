import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { getSession } from '@/server/session';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.onboarded) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute left-8 top-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        <OnboardingForm name={session.user.name} />
      </div>
    </div>
  );
}
