import 'server-only';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cases, comments, documents, user } from '@/db/schema';
import type { SessionUser } from '@/lib/auth';
import type { CaseComment, CaseDocument, CaseFile, PublicProfile } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * The single place that decides who may see a case.
 * - The lawyer who owns it can see and edit it.
 * - A client can see it if their *verified* account email matches the case's client email.
 * - Admins manage verifications only and do not see case contents.
 */
export async function getCaseAccess(caseId: string, viewer: SessionUser) {
  if (!isUuid(caseId)) return null;
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!row) return null;

  const isOwner = viewer.role === 'lawyer' && row.lawyerId === viewer.id;
  const isClient =
    viewer.role === 'client' && viewer.emailVerified && row.clientEmail === normalizeEmail(viewer.email);

  if (!isOwner && !isClient) return null;
  return { caseFile: row as CaseFile, isOwner };
}

/** SQL condition for "cases this user may see". */
function visibleTo(viewer: SessionUser) {
  if (viewer.role === 'lawyer') return eq(cases.lawyerId, viewer.id);
  if (viewer.role === 'client' && viewer.emailVerified) {
    return eq(cases.clientEmail, normalizeEmail(viewer.email));
  }
  return sql`false`;
}

export async function listCasesForUser(viewer: SessionUser): Promise<CaseFile[]> {
  return db.select().from(cases).where(visibleTo(viewer)).orderBy(desc(cases.createdAt));
}

export async function countDocumentsForUser(viewer: SessionUser): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(documents)
    .innerJoin(cases, eq(documents.caseId, cases.id))
    .where(visibleTo(viewer));
  return value;
}

export async function listDocuments(caseId: string): Promise<CaseDocument[]> {
  return db
    .select({
      id: documents.id,
      name: documents.name,
      description: documents.description,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      tags: documents.tags,
      uploadedAt: documents.uploadedAt,
    })
    .from(documents)
    .where(eq(documents.caseId, caseId))
    .orderBy(desc(documents.uploadedAt));
}

export async function listComments(caseId: string): Promise<CaseComment[]> {
  const rows = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: user.name,
      authorRole: user.role,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.authorId, user.id))
    .where(eq(comments.caseId, caseId))
    .orderBy(asc(comments.createdAt))
    .limit(500);
  return rows;
}

const publicProfileColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  phoneNumber: user.phoneNumber,
  lawFirmName: user.lawFirmName,
  lawFirmAddress: user.lawFirmAddress,
  lskRegistrationNumber: user.lskRegistrationNumber,
  lskVerificationStatus: user.lskVerificationStatus,
  lawFirmVerificationStatus: user.lawFirmVerificationStatus,
  createdAt: user.createdAt,
};

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const [row] = await db.select(publicProfileColumns).from(user).where(eq(user.id, id)).limit(1);
  return row ?? null;
}

/** A registered, verified client account with this email (used by the lawyer who owns the case). */
export async function getClientProfileByEmail(email: string): Promise<PublicProfile | null> {
  const [row] = await db
    .select(publicProfileColumns)
    .from(user)
    .where(and(eq(user.email, normalizeEmail(email)), eq(user.role, 'client'), eq(user.emailVerified, true)))
    .limit(1);
  return row ?? null;
}

export interface ClientSummary {
  email: string;
  name: string;
  caseCount: number;
}

/** Clients a lawyer has cases with (a lawyer cannot list every client on the platform). */
export async function listClientsForLawyer(lawyerId: string): Promise<ClientSummary[]> {
  const rows = await db
    .select({
      email: cases.clientEmail,
      name: sql<string>`max(${cases.clientName})`,
      caseCount: count(),
    })
    .from(cases)
    .where(eq(cases.lawyerId, lawyerId))
    .groupBy(cases.clientEmail)
    .orderBy(sql`max(${cases.clientName})`);
  return rows;
}

export async function listCasesForLawyerAndClient(lawyerId: string, clientEmail: string): Promise<CaseFile[]> {
  return db
    .select()
    .from(cases)
    .where(and(eq(cases.lawyerId, lawyerId), eq(cases.clientEmail, normalizeEmail(clientEmail))))
    .orderBy(desc(cases.createdAt));
}
