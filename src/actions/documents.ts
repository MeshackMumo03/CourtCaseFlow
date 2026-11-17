'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { tagLegalDocument } from '@/ai/flows/tag-legal-documents';
import { env } from '@/lib/env';
import {
  deleteCaseDocument,
  detectDocumentType,
  MAX_DOCUMENT_BYTES,
  signedDocumentUrl,
  uploadCaseDocument,
} from '@/lib/storage';
import { tagsSchema } from '@/lib/validation';
import { runAction, UserFacingError } from '@/server/action-utils';
import { getCaseAccess, isUuid } from '@/server/cases';
import { requireUser } from '@/server/session';

/** Only the lawyer who owns the case may change its documents. */
async function requireOwnedCase(caseId: string) {
  const me = await requireUser(['lawyer']);
  const access = await getCaseAccess(caseId, me);
  if (!access?.isOwner) throw new UserFacingError('Case not found.');
  return me;
}

/** Strip path separators and control characters from a user-supplied file name. */
function safeFileName(name: string) {
  const cleaned = name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim();
  return (cleaned || 'document').slice(0, 200);
}

export async function uploadDocumentAction(caseId: string, formData: FormData) {
  return runAction('uploadDocument', async () => {
    const me = await requireOwnedCase(caseId);

    const file = formData.get('document');
    const description = z.string().trim().max(500).parse(formData.get('description') ?? '');
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError('Choose a file to upload.');
    if (file.size > MAX_DOCUMENT_BYTES) throw new UserFacingError('Files must be 4 MB or smaller.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectDocumentType(buffer);
    if (!type) throw new UserFacingError('Only PDF, Word (.doc/.docx), JPEG or PNG files are allowed.');

    const { storageKey, bytes } = await uploadCaseDocument(buffer, caseId, type.ext);
    try {
      const [created] = await db
        .insert(documents)
        .values({
          caseId,
          name: safeFileName(file.name),
          description,
          storageKey,
          mimeType: type.mime,
          sizeBytes: bytes,
          uploaderId: me.id,
        })
        .returning({ id: documents.id, name: documents.name });

      revalidatePath(`/cases/${caseId}`);
      return { success: true as const, message: 'Document uploaded.', data: created };
    } catch (error) {
      // Don't leave an orphaned file in storage if the database write fails.
      await deleteCaseDocument(storageKey).catch(() => undefined);
      throw error;
    }
  });
}

async function getOwnedDocument(caseId: string, documentId: string) {
  if (!isUuid(documentId)) throw new UserFacingError('Document not found.');
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.caseId, caseId)))
    .limit(1);
  if (!doc) throw new UserFacingError('Document not found.');
  return doc;
}

export async function saveDocumentTagsAction(caseId: string, documentId: string, tags: string[]) {
  return runAction('saveTags', async () => {
    await requireOwnedCase(caseId);
    await getOwnedDocument(caseId, documentId);
    const clean = Array.from(new Set(tagsSchema.parse(tags)));

    await db.update(documents).set({ tags: clean }).where(eq(documents.id, documentId));
    revalidatePath(`/cases/${caseId}`);
    return { success: true as const, message: 'Tags saved.' };
  });
}

export async function deleteDocumentAction(caseId: string, documentId: string) {
  return runAction('deleteDocument', async () => {
    await requireOwnedCase(caseId);
    const doc = await getOwnedDocument(caseId, documentId);

    // Delete the database record first so the document disappears even if storage cleanup fails.
    await db.delete(documents).where(eq(documents.id, documentId));
    await deleteCaseDocument(doc.storageKey).catch((error) => {
      console.error('[deleteDocument] storage cleanup failed', doc.storageKey, error);
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true as const, message: 'Document deleted.' };
  });
}

// Gemini accepts these inline; Word files are not supported for tagging.
const AI_SUPPORTED = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function suggestDocumentTagsAction(caseId: string, documentId: string) {
  return runAction('suggestTags', async () => {
    await requireOwnedCase(caseId);
    if (!env.GEMINI_API_KEY) throw new UserFacingError('AI tagging is not configured (GEMINI_API_KEY is missing).');
    const doc = await getOwnedDocument(caseId, documentId);
    if (!AI_SUPPORTED.has(doc.mimeType)) {
      throw new UserFacingError('AI tagging works with PDF, JPEG and PNG files.');
    }

    const response = await fetch(signedDocumentUrl(doc.storageKey));
    if (!response.ok) throw new Error(`Could not read document from storage (${response.status})`);
    const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');

    const result = await tagLegalDocument({
      documentDataUri: `data:${doc.mimeType};base64,${base64}`,
      documentDescription: doc.description || doc.name,
    });
    const tags = tagsSchema.parse(result.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20));
    return { success: true as const, message: `${tags.length} tags suggested.`, data: { tags } };
  });
}
