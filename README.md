# CourtCaseFlow v2

Secure legal case management for small law firms: lawyers manage cases, hearings and documents; clients follow their cases and message their lawyer.

This is a rewrite of the original Firebase app with no Firebase dependency:

| Concern | v1 (Firebase) | v2 |
| --- | --- | --- |
| Database | Firestore | **Neon Postgres** (free plan, created from the Vercel dashboard) via Drizzle ORM |
| Sign-in | Firebase Auth | **Better Auth** (runs inside the app; no extra service) |
| Files | Firebase Storage | **Cloudinary** private ("authenticated") storage |
| Email | Firebase "Trigger Email" extension | Any SMTP server, e.g. Gmail with an App Password |
| Hosting | Firebase App Hosting | **Vercel** (Hobby, free) |
| AI tagging | Genkit + Gemini | Genkit + Gemini (unchanged, now server-only) |

## Security changes

- **Server-side authorization everywhere.** Pages and server actions read the user from the session cookie and check ownership in the database query. v1 trusted user IDs sent by the browser, so anyone could create, edit or read any case, upload files as anyone, or approve lawyers.
- **Email verification is required.** Clients see cases by matching their email, so the address must be proven first.
- **Real admin role.** Admin is a database role granted with `npm run make-admin`, not a hard-coded email address.
- **Private documents.** Files are stored as private Cloudinary assets. Downloads go through `/api/documents/:id/download`, which checks access and then redirects to a link that expires after 5 minutes. Uploads are checked by their file signature, not the browser-supplied type, and limited to 4 MB.
- **Real two-factor authentication** (authenticator app plus backup codes), replacing the simulated setup.
- **Rate limiting** on sign-in, sign-up, password reset and 2FA. **Breached-password check** (Have I Been Pwned k-anonymity API) and a 10-character minimum.
- **Strict security headers:** a per-request nonce Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy.
- **No secrets in code.** All configuration comes from validated environment variables (`src/lib/env.ts`).
- **AI tagging is server-only.** The Gemini flow is no longer a public server action. The server reads the file itself after an access check.
- **Smaller attack surface.** Lawyers can no longer list every client on the platform, the build fails on type errors, and unused dependencies (PWA plugin, Firebase SDKs, charts) are removed.

## Setup

1. **Install:** `npm install`
2. **Database:** in the Vercel dashboard, open your project, go to **Storage**, choose **Create Database**, then **Neon** (free). Link the project locally with `vercel link`, then run `vercel env pull .env.local`.
3. **Environment:** copy `.env.example` to `.env.local` (or add to the file you pulled) and fill in the Better Auth secret, Cloudinary keys and SMTP details.
4. **Create tables:** `npm run db:migrate`
5. **Run:** `npm run dev`, then open http://localhost:9002
6. **Make yourself admin:** sign up, verify your email, then run `npm run make-admin -- you@example.com`

Without SMTP settings in development, verification and reset emails are printed in the terminal.

## Deploying to Vercel

Add the same environment variables in **Project → Settings → Environment Variables** and set `BETTER_AUTH_URL` to the production URL. Run `npm run db:migrate` against the production database before the first deploy.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 9002 |
| `npm run build` / `start` | Production build / server |
| `npm run typecheck` / `lint` | Type check / ESLint |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run make-admin -- <email>` | Grant admin to a verified account |

## Not migrated

Existing Firestore data and Firebase Auth users were not copied over. Users need to sign up again. Once v2 is live, delete the old Firebase project, or lock it down with deny-all rules. Its config was committed to the v1 repository, and it had no security rules in that repo.
