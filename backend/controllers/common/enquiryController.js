import { processEnquirySubmission } from '../../services/common/enquiryService.js';

// ── POST /api/enquiries — Public lead capture (seller-website forms) ──
export const createEnquiry = async (req, res) => {
  const result = await processEnquirySubmission(req.body || {});

  if (result.type === 'error') {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  // 'success' and 'honeypot' both return a benign 200 — the enquiry itself is
  // persisted; email/SMS delivery failures are logged, never surfaced here.
  return res.json({ ok: true });
};