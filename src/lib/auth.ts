import 'server-only';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { haveIBeenPwned, twoFactor } from 'better-auth/plugins';
import { count, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { env, googleEnabled } from '@/lib/env';
import { actionEmail, sendMail } from '@/lib/mail';

export const auth = betterAuth({
  appName: 'CourtCaseFlow',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, { provider: 'pg', schema }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // Clients are matched to cases by email, so the address must be proven before sign-in.
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your CourtCaseFlow password',
        html: actionEmail('Reset your password', 'Use the button below to choose a new password. The link expires in 30 minutes.', url, 'Reset password'),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Verify your CourtCaseFlow email',
        html: actionEmail('Confirm your email address', 'Confirm this address to finish setting up your account.', url, 'Verify email'),
      });
    },
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: 'select_account',
        },
      }
    : undefined,

  user: {
    additionalFields: {
      // `input: false` means these can never be set by the browser through the auth API.
      // They are only changed by server actions that check permissions.
      role: { type: 'string', defaultValue: 'client', input: false },
      onboarded: { type: 'boolean', defaultValue: false, input: false },
      phoneNumber: { type: 'string', required: false, input: false },
      lawFirmName: { type: 'string', required: false, input: false },
      lawFirmAddress: { type: 'string', required: false, input: false },
      lskRegistrationNumber: { type: 'string', required: false, input: false },
      lskVerificationStatus: { type: 'string', defaultValue: 'unverified', input: false },
      lawFirmVerificationStatus: { type: 'string', defaultValue: 'unverified', input: false },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendMail({
          to: user.email,
          subject: 'Approve your CourtCaseFlow email change',
          html: actionEmail('Approve email change', `Someone asked to change your account email to ${newEmail}. Approve only if this was you.`, url, 'Approve change'),
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (u) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(schema.cases)
          .where(eq(schema.cases.lawyerId, u.id));
        if (value > 0) {
          throw new APIError('BAD_REQUEST', {
            message: 'You still manage cases. Transfer or delete them before deleting your account.',
          });
        }
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 15,
  },

  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/request-password-reset': { window: 300, max: 3 },
      '/send-verification-email': { window: 300, max: 3 },
      '/two-factor/verify-totp': { window: 60, max: 5 },
      '/two-factor/verify-backup-code': { window: 60, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
  },

  plugins: [
    twoFactor({ issuer: 'CourtCaseFlow' }),
    // Rejects passwords found in known data breaches. Uses the Pwned Passwords k-anonymity API:
    // only the first 5 characters of the password's SHA-1 hash are sent, never the password.
    haveIBeenPwned(),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session['user'];
