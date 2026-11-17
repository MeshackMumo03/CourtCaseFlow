import 'server-only';
import { asc, count, eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cases, user } from '@/db/schema';

export async function getAdminStats() {
  const [users] = await db
    .select({
      total: count(),
      lawyers: sql<number>`count(*) filter (where ${user.role} = 'lawyer')`.mapWith(Number),
      clients: sql<number>`count(*) filter (where ${user.role} = 'client')`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${user.role} = 'lawyer' and (${user.lskVerificationStatus} = 'pending_review' or ${user.lawFirmVerificationStatus} = 'pending_review'))`.mapWith(Number),
    })
    .from(user);
  const [{ value: totalCases }] = await db.select({ value: count() }).from(cases);
  return { ...users, totalCases };
}

export async function listLawyers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      lskRegistrationNumber: user.lskRegistrationNumber,
      lskVerificationStatus: user.lskVerificationStatus,
      lawFirmName: user.lawFirmName,
      lawFirmVerificationStatus: user.lawFirmVerificationStatus,
    })
    .from(user)
    .where(eq(user.role, 'lawyer'))
    .orderBy(
      // Lawyers waiting for review first.
      sql`case when ${or(eq(user.lskVerificationStatus, 'pending_review'), eq(user.lawFirmVerificationStatus, 'pending_review'))} then 0 else 1 end`,
      asc(user.name),
    );
}
