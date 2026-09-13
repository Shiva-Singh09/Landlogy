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
