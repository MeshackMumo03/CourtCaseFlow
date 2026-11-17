import 'server-only';
import nodemailer from 'nodemailer';
import { env, smtpEnabled } from '@/lib/env';

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 465,
      secure: (env.SMTP_PORT ?? 465) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

/** Escape user-controlled text before putting it in an HTML email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[mail] SMTP is not configured; could not send "${subject}".`);
      return;
    }
    // Development fallback: print the message so links can be clicked from the terminal.
    console.info(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] ${html.replace(/<[^>]+>/g, ' ')}\n`);
    return;
  }

  await transporter.sendMail({
    from: env.MAIL_FROM ?? env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export function actionEmail(title: string, body: string, url: string, cta: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <p><a href="${encodeURI(url)}" style="display:inline-block;padding:10px 16px;background:#3B82F6;color:#fff;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>
      <p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
      <p style="color:#666;font-size:12px">CourtCaseFlow</p>
    </div>`;
}
