'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { comments } from '@/db/schema';
import { runAction, UserFacingError } from '@/server/action-utils';
import { getCaseAccess, listComments } from '@/server/cases';
import { requireUser } from '@/server/session';
import { commentSchema } from '@/lib/validation';

export async function addCommentAction(caseId: string, text: string) {
  return runAction('addComment', async () => {
    const me = await requireUser(['lawyer', 'client']);
    const access = await getCaseAccess(caseId, me);
    if (!access) throw new UserFacingError('Case not found.');

    const data = commentSchema.parse({ text });
    // The author comes from the session, never from the browser.
    await db.insert(comments).values({ caseId, authorId: me.id, text: data.text });

    revalidatePath(`/cases/${caseId}`);
    return { success: true as const, message: 'Comment posted.' };
  });
}

/** Used by the case page to poll for new messages. */
export async function getCommentsAction(caseId: string) {
  return runAction('getComments', async () => {
    const me = await requireUser(['lawyer', 'client']);
    const access = await getCaseAccess(caseId, me);
    if (!access) throw new UserFacingError('Case not found.');
    return { success: true as const, message: 'ok', data: await listComments(caseId) };
  });
}
