import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth, type SessionUser } from '@/lib/auth';
import type { Role } from '@/db/schema';

/** Thrown by server actions when the caller is not allowed to do something. */
export class AuthError extends Error {}

/** Session for the current request (deduplicated per request). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** For pages: redirect to login if signed out, to onboarding if the profile isn't finished. */
export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect('/login');
  const user = session.user;
  if (!user.onboarded) redirect('/onboarding');
  if (roles && !roles.includes(user.role as Role)) redirect('/dashboard');
  return user;
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError('You must be signed in.');
  const user = session.user;
  if (!user.onboarded) throw new AuthError('Finish setting up your profile first.');
  if (roles && !roles.includes(user.role as Role)) {
    throw new AuthError('You do not have permission to do that.');
  }
  return user;
}
