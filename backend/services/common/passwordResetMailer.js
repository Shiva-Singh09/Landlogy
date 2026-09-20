import { getBrevoClient } from './emailService.js';
import { escapeHtml, isValidEmail } from '../../utils/validation.js';

// ── Password Reset OTP Email Template ────────────────────────────────
export const buildPasswordResetOtpMail = ({ name, otp, expiryMinutes = 5 }) => {
  const subject = 'Your Password Reset Code — LANDLOGY';
  const displayName = name ? escapeHtml(name) : 'Valued Client';
  const displayOtp = String(otp || '').trim();

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F7F9;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#191724;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E5EC;box-shadow:0 8px 24px rgba(25,23,36,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#191724;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFB400;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">LANDLOGY</p>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.01em;">Password Reset Verification</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4458;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4A4458;">
                We received a request to reset the password for your LANDLOGY client account. Use the 6-digit verification code below to proceed:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#F7F7F9;border:1px dashed #FFB400;border-radius:12px;padding:24px;">
                    <span style="display:block;font-size:12px;font-weight:700;color:#7B7489;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Your One-Time Code</span>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;color:#191724;letter-spacing:8px;padding-left:8px;">${escapeHtml(displayOtp)}</span>
                    <span style="display:block;font-size:13px;font-weight:600;color:#B3252A;margin-top:10px;">
                      &#x23F1; Valid for ${escapeHtml(String(expiryMinutes))} minutes
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7B7489;">
                <strong>Didn't request this?</strong> If you did not make this request, you can safely ignore this email. Your password will remain unchanged and your account stays secure.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E7E5EC;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#FAFAFC;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#7B7489;">
                LANDLOGY &bull; Research &bull; Verify &bull; Transact &bull; Grow
              </p>
              <p style="margin:0;font-size:11px;color:#A29BB0;">
                This is an automated security email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = [
    'LANDLOGY — Password Reset Code',
    '==============================',
    `Hello ${name || 'Valued Client'},`,
    '',
    'We received a request to reset the password for your LANDLOGY client account.',
    `Your verification code is: ${displayOtp}`,
    `This code will expire in ${expiryMinutes} minutes.`,
    '',
    "If you did not request a password reset, you can safely ignore this email. Your account remains secure.",
    '',
    '— LANDLOGY Team',
    'Research • Verify • Transact • Grow',
  ].join('\n');

  return {
    subject,
    htmlContent,
    textContent,
    headers: { 'X-LANDLOGY-Message-Type': 'password-reset-otp' },
  };
};

// ── Password Reset Success Email Template ────────────────────────────
export const buildPasswordResetSuccessMail = ({ name }) => {
  const subject = 'Your LANDLOGY Password Was Changed';
  const displayName = name ? escapeHtml(name) : 'Valued Client';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F7F9;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#191724;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E5EC;box-shadow:0 8px 24px rgba(25,23,36,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#191724;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFB400;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">LANDLOGY</p>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.01em;">Password Reset Successful</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4458;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4458;">
                Your LANDLOGY client account password has been successfully updated.
              </p>
              <div style="background-color:#E4F7F1;border:1px solid #00A884;border-radius:10px;padding:16px 20px;margin:20px 0;color:#067A60;font-size:14px;line-height:1.5;">
                &#x2714; <strong>Account Secured:</strong> You can now sign in with your new password.
              </div>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#7B7489;">
                If you did not perform this action, please contact LANDLOGY support immediately.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E7E5EC;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#FAFAFC;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#7B7489;">
                LANDLOGY &bull; Research &bull; Verify &bull; Transact &bull; Grow
              </p>
              <p style="margin:0;font-size:11px;color:#A29BB0;">
                This is an automated security notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = [
    'LANDLOGY — Password Updated Successfully',
    '========================================',
    `Hello ${name || 'Valued Client'},`,
    '',
    'Your LANDLOGY client account password has been successfully updated.',
    'You can now sign in with your new password.',
    '',
    'If you did not perform this change, please contact LANDLOGY support immediately.',
    '',
    '— LANDLOGY Team',
  ].join('\n');

  return {
    subject,
    htmlContent,
    textContent,
    headers: { 'X-LANDLOGY-Message-Type': 'password-reset-success' },
  };
};

// ── Brevo Dispatcher Helper ──────────────────────────────────────────
export const sendPasswordResetOtpEmail = async ({ to, name, otp, expiryMinutes = 5 }) => {
  if (!to || !isValidEmail(to)) {
    return { sent: false, reason: 'invalid_recipient_email' };
  }
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.warn('[MAIL] Brevo email sending skipped: BREVO_API_KEY or MAIL_FROM not configured.');
    return { sent: false, reason: 'mailer_not_configured' };
  }

  try {
    const brevo = getBrevoClient();
    const mail = buildPasswordResetOtpMail({ name, otp, expiryMinutes });
    const payload = {
      sender: { name: 'LANDLOGY', email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject: mail.subject,
      htmlContent: mail.htmlContent,
      textContent: mail.textContent,
      headers: mail.headers,
    };

    const result = await brevo.transactionalEmails.sendTransacEmail(payload);
    const messageId = result?.messageId || result?.messageIds?.[0] || 'queued';
    console.log(`[MAIL] Password reset OTP sent to ${to} (Message ID: ${messageId})`);
    return { sent: true, messageId };
  } catch (err) {
    console.error(`[MAIL] Failed to send password reset OTP to ${to}:`, err?.message || err);
    return { sent: false, reason: err?.message || 'unknown_error' };
  }
};

export const sendPasswordResetSuccessEmail = async ({ to, name }) => {
  if (!to || !isValidEmail(to)) {
    return { sent: false, reason: 'invalid_recipient_email' };
  }
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    return { sent: false, reason: 'mailer_not_configured' };
  }

  try {
    const brevo = getBrevoClient();
    const mail = buildPasswordResetSuccessMail({ name });
    const payload = {
      sender: { name: 'LANDLOGY', email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject: mail.subject,
      htmlContent: mail.htmlContent,
      textContent: mail.textContent,
      headers: mail.headers,
    };

    const result = await brevo.transactionalEmails.sendTransacEmail(payload);
    const messageId = result?.messageId || result?.messageIds?.[0] || 'queued';
    console.log(`[MAIL] Password reset confirmation sent to ${to} (Message ID: ${messageId})`);
    return { sent: true, messageId };
  } catch (err) {
    console.error(`[MAIL] Failed to send password reset confirmation to ${to}:`, err?.message || err);
    return { sent: false, reason: err?.message || 'unknown_error' };
  }
};
