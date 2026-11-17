import 'server-only';
import { z } from 'zod';

/**
 * Server-side environment variables, validated once at startup.
 * Nothing in here is ever sent to the browser.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  GEMINI_API_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

/**
 * `next build` loads every route module to collect page config, but never serves a
 * request, so secrets aren't needed then. During the build only, missing values are
 * filled with inert placeholders. At runtime a missing variable still fails loudly.
 */
const BUILD_PLACEHOLDERS = {
  DATABASE_URL: 'postgresql://build:build@build.invalid/build',
  BETTER_AUTH_SECRET: 'build-time-placeholder-not-used-at-runtime',
  BETTER_AUTH_URL: 'http://build.invalid',
  CLOUDINARY_CLOUD_NAME: 'build-placeholder',
  CLOUDINARY_API_KEY: 'build-placeholder',
  CLOUDINARY_API_SECRET: 'build-placeholder',
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const source = isBuild
  ? { ...BUILD_PLACEHOLDERS, ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)) }
  : process.env;

const parsed = schema.safeParse(source);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid or missing environment variables:\n${issues}\nSee .env.example.`);
}

export const env = parsed.data;

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const smtpEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
