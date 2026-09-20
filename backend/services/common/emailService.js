import { BrevoClient } from '@getbrevo/brevo';

// Brevo config check (server-only; never expose env values to the client).
if(!process.env.BREVO_API_KEY){
  console.error('[MAIL] BREVO_API_KEY is missing. Email sending is disabled. Set BREVO_API_KEY in the server environment.');
}
if(!process.env.MAIL_TO||!process.env.MAIL_FROM){
  console.error('[MAIL] MAIL_TO and/or MAIL_FROM is missing. Email sending is disabled.');
}

// Single shared Brevo client — one source of truth for transactional email.
let brevoClient = null;
export const getBrevoClient = () => {
    if (!brevoClient) {
    brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  }
  return brevoClient;
};

// Reusable, mockable transactional-mailer. Uses the single shared Brevo client
// (no new provider is introduced). The recipient is always supplied by the
// caller and is derived server-side from the authenticated user.
export const transporter = {
  // Send a transactional email via Brevo SMTP/email API.
  // Input: { to, subject, html }  ->  Result: { sent: true } | { skipped, reason }
  async sendMail({ to, subject, html }) {
    const client = getBrevoClient();
    if (!client) {
      console.warn('[MAIL] sendMail skipped: Brevo client unavailable (BREVO_API_KEY/MAIL_FROM missing).');
      return { skipped: true, reason: 'email not configured' };
    }
    const from = process.env.MAIL_FROM;
    if (!from) {
      console.warn('[MAIL] sendMail skipped: MAIL_FROM is missing.');
      return { skipped: true, reason: 'sender not configured' };
    }
    await client.transactionalEmails.sendTransacEmail({
      sender: { email: from, name: 'LANDLOGY' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    return { sent: true };
  },
};
