'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { user } from '@/db/schema';
import { runAction, UserFacingError } from '@/server/action-utils';
import { requireUser } from '@/server/session';

const inputSchema = z.object({
  userId: z.string().min(1),
  verificationType: z.enum(['lsk', 'lawFirm']),
  newStatus: z.enum(['verified', 'rejected']),
});

export async function updateUserVerificationStatusAction(input: z.infer<typeof inputSchema>) {
  return runAction('updateVerification', async () => {
    await requireUser(['admin']);
    const { userId, verificationType, newStatus } = inputSchema.parse(input);

    const set =
      verificationType === 'lsk'
        ? { lskVerificationStatus: newStatus, updatedAt: new Date() }
        : { lawFirmVerificationStatus: newStatus, updatedAt: new Date() };

    const updated = await db
      .update(user)
      .set(set)
      .where(and(eq(user.id, userId), eq(user.role, 'lawyer')))
      .returning({ id: user.id });

    if (updated.length === 0) throw new UserFacingError('Lawyer not found.');
    revalidatePath('/admin/verifications');
    const label = verificationType === 'lsk' ? 'LSK' : 'Law firm';
    return { success: true as const, message: `${label} status set to ${newStatus}.` };
  });
}
