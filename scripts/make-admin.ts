/**
 * Promote an existing, email-verified account to admin.
 *   npm run make-admin -- someone@example.com
 * Admin rights can only be granted from a machine that has the database URL.
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: ['.env.local', '.env'], quiet: true });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run make-admin -- <email>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    update "user" set role = 'admin', onboarded = true, updated_at = now()
    where email = ${email} and email_verified = true
    returning id`;
  if (rows.length === 0) throw new Error(`No verified account found for ${email}. Sign up and verify the email first.`);
  console.log(`${email} is now an admin.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
