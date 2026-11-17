import { AppShell } from '@/components/layout/AppShell';
import type { Role } from '@/types';
import { requirePageUser } from '@/server/session';

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image ?? null, role: user.role as Role }}>
      {children}
    </AppShell>
  );
}
