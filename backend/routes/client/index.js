import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { uploadMulti } from '../../config/upload.js';
import { getMe, createProperty, listProperties, getProperty, uploadImages } from '../../controllers/client/clientController.js';
import { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead } from '../../controllers/client/clientNotificationController.js';
import { requestReset, verifyReset } from '../../controllers/client/clientAuthController.js';

const router = Router();

// Seller-only authorization applies to every route in this module.
const sellerOnly = [authenticate, authorize('seller')];

router.get('/me', sellerOnly, getMe);
router.post('/properties', sellerOnly, createProperty);          // owner always derived server-side; status forced to under_review
router.get('/properties', sellerOnly, listProperties);            // owner always derived server-side
router.get('/properties/:id', sellerOnly, getProperty);          // foreign property → 404
router.post('/properties/:id/images', sellerOnly, uploadMulti.array('image', 10), uploadImages); // Seller attaches images to own property

// ── Seller notifications (own rows only; recipient derived from the JWT) ──
// Static paths are registered before `/:id/read` so they can never be captured
// as a notification id. Admin notification routes live in routes/admin and are
// untouched by this module.
router.get('/notifications/unread-count', sellerOnly, unreadCount);
router.patch('/notifications/read-all', sellerOnly, markAllNotificationsRead);
router.get('/notifications', sellerOnly, listNotifications);
router.patch('/notifications/:id/read', sellerOnly, markNotificationRead);

// ── Seller self-service password reset (Task 6 recovery flow) ──────────────
// Both routes are authenticated + seller-authorized (sellerOnly). Identity is
// always derived from req.user.id — never trusted from the request body.
router.post('/password-reset/request', sellerOnly, requestReset);
router.post('/password-reset/verify', sellerOnly, verifyReset);


// Convert multer upload validation errors into proper JSON responses for the
// Seller image endpoint (file type / size / count). This error handler is scoped
// to the client router and does not affect Admin image behavior (separate router).
router.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: 'File too large. Maximum size is 5 MB.' });
  }
  if (err?.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ ok: false, error: 'Too many files. Maximum 10 images per request.' });
  }
  if (/unsupported file type/i.test(err?.message || '')) {
    return res.status(400).json({ ok: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WebP.' });
  }
  console.error('[CLIENT] Unhandled router error:', err?.message || err);
  return res.status(502).json({ ok: false, error: 'Unable to process the request right now. Please try again later.' });
});

export default router;
