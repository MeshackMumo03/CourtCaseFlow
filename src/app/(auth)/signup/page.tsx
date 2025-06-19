import { SignupForm } from '@/components/auth/SignupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - CourtCaseFlow',
};

export default function SignupPage() {
  return <SignupForm />;
}
