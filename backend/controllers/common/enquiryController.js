import { processEnquirySubmission } from '../../services/common/enquiryService.js';
import { processFeedbackSubmission } from '../../services/common/feedbackService.js';

// ── POST /api/enquiries — Public lead capture (seller-website forms) ──
export const createEnquiry = async (req, res) => {
  // Landing-page feedback is a product-feedback channel, not a sales lead: it
  // is persisted to its own `feedback` table and never enters the enquiry
  // workflow (no enquiry row, no notification, no enquiry email/SMS — only the
  // single static thank-you SMS). The normal branch below is unchanged.
  if (req.body?.formType === 'feedback') {
    const feedback = await processFeedbackSubmission(req.body || {});

    if (feedback.type === 'error') {
      return res.status(feedback.status).json({ ok: false, error: feedback.error });
    }
    // 'success' and 'honeypot' both return a benign 200.
    return res.json({ ok: true });
  }

  const result = await processEnquirySubmission(req.body || {});

  if (result.type === 'error') {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  // 'success' and 'honeypot' both return a benign 200 — the enquiry itself is
  // persisted; email/SMS delivery failures are logged, never surfaced here.
  return res.json({ ok: true });
};