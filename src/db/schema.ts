import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

import { CASE_STATUSES, type Role, type VerificationStatus } from '../lib/constants';

export { CASE_STATUSES, ROLES, VERIFICATION_STATUSES } from '../lib/constants';
export type { CaseStatus, Role, VerificationStatus } from '../lib/constants';

export const caseStatusEnum = pgEnum('case_status', CASE_STATUSES);

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                  */
/* (user, session, account, verification, two_factor, rate_limit)     */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean().default(false),

  // App profile fields (declared as additionalFields in src/lib/auth.ts).
  role: text().$type<Role>().notNull().default('client'),
  onboarded: boolean().notNull().default(false),
  phoneNumber: text(),
  lawFirmName: text(),
  lawFirmAddress: text(),
  lskRegistrationNumber: text(),
  lskVerificationStatus: text().$type<VerificationStatus>().notNull().default('unverified'),
  lawFirmVerificationStatus: text().$type<VerificationStatus>().notNull().default('unverified'),
});

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
  },
  (t) => [index('two_factor_user_id_idx').on(t.userId), index('two_factor_secret_idx').on(t.secret)],
);

export const rateLimit = pgTable('rate_limit', {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
});

/* ------------------------------------------------------------------ */
/* App tables                                                          */
/* ------------------------------------------------------------------ */

export const cases = pgTable(
  'cases',
  {
    id: uuid().primaryKey().defaultRandom(),
    caseNumber: text().notNull(),
    clientName: text().notNull(),
    /** Always stored lower-case; clients see cases whose clientEmail matches their account email. */
    clientEmail: text().notNull(),
    court: text().notNull(),
    status: caseStatusEnum().notNull().default('pending'),
    description: text(),
    lawyerId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    hearingDate: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('cases_lawyer_id_idx').on(t.lawyerId),
    index('cases_client_email_idx').on(t.clientEmail),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid()
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    /** Cloudinary public_id of a private ("authenticated") raw asset. Never exposed to clients. */
    storageKey: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    uploaderId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    uploadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('documents_case_id_idx').on(t.caseId)],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid()
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    authorId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    text: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_case_id_idx').on(t.caseId)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const casesRelations = relations(cases, ({ one, many }) => ({
  lawyer: one(user, { fields: [cases.lawyerId], references: [user.id] }),
  documents: many(documents),
  comments: many(comments),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, { fields: [documents.caseId], references: [cases.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  case: one(cases, { fields: [comments.caseId], references: [cases.id] }),
  author: one(user, { fields: [comments.authorId], references: [user.id] }),
}));
