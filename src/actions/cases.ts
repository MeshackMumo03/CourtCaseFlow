'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cases } from '@/db/schema';
import { runAction, UserFacingError } from '@/server/action-utils';
import { isUuid } from '@/server/cases';
import { requireUser } from '@/server/session';
import { caseSchema, type CaseInput } from '@/lib/validation';

export async function createCaseAction(input: CaseInput) {
  return runAction('createCase', async () => {
    const me = await requireUser(['lawyer']);
    const data = caseSchema.parse(input);

    const [created] = await db
      .insert(cases)
      .values({
        caseNumber: data.caseNumber,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        court: data.court,
        status: data.status,
        description: data.description || null,
        hearingDate: data.hearingDate ? new Date(data.hearingDate) : null,
        lawyerId: me.id,
      })
      .returning({ id: cases.id });

    revalidatePath('/', 'layout');
    return { success: true as const, message: 'Case created.', data: { caseId: created.id } };
  });
}

export async function updateCaseAction(caseId: string, input: CaseInput) {
  return runAction('updateCase', async () => {
    const me = await requireUser(['lawyer']);
    if (!isUuid(caseId)) throw new UserFacingError('Case not found.');
    const data = caseSchema.parse(input);

    // The client on a case is fixed once it's created, so a case can't be handed to someone else's account.
    // Ownership is enforced in the WHERE clause, so another lawyer's case can never be changed.
    const updated = await db
      .update(cases)
      .set({
        caseNumber: data.caseNumber,
        court: data.court,
        status: data.status,
        description: data.description || null,
        hearingDate: data.hearingDate ? new Date(data.hearingDate) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(cases.id, caseId), eq(cases.lawyerId, me.id)))
      .returning({ id: cases.id });

    if (updated.length === 0) throw new UserFacingError('Case not found.');
    revalidatePath('/', 'layout');
    return { success: true as const, message: 'Case updated.', data: { caseId } };
  });
}
