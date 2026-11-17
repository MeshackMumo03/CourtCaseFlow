import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { signedDocumentUrl } from '@/lib/storage';
import { getCaseAccess, isUuid } from '@/server/cases';
import { getSession } from '@/server/session';

/**
 * Checks that the signed-in user may see the document's case, then redirects
 * to a Cloudinary link that expires in 5 minutes. Storage URLs are never stored
 * in the page, so a copied link stops working.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(documentId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [doc] = await db
    .select({ caseId: documents.caseId, storageKey: documents.storageKey })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc || !session.user.onboarded) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const access = await getCaseAccess(doc.caseId, session.user);
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const response = NextResponse.redirect(signedDocumentUrl(doc.storageKey), 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
