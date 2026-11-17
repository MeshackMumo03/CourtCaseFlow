import { and, eq } from 'drizzle-orm';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { db } from '@/db';
import { account } from '@/db/schema';
import { requirePageUser } from '@/server/session';

export default async function SettingsPage() {
  const user = await requirePageUser();
  // Google-only accounts have no password to change or confirm with.
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, 'credential')))
    .limit(1);

  return <SettingsPanel hasPassword={Boolean(credential)} twoFactorEnabled={Boolean(user.twoFactorEnabled)} />;
}
