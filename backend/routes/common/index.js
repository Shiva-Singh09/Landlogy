import { Router } from 'express';
import { healthCheck } from '../../controllers/common/healthController.js';
import { login, setPassword, register } from '../../controllers/common/authController.js';
import { forgotPassword, verifyOtp, resetPassword } from '../../controllers/common/passwordResetController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { forgotPasswordLimiter } from '../../middleware/security.js';
import { createEnquiry } from '../../controllers/common/enquiryController.js';

const router = Router();

// GET /api/health — service + database health
router.get('/health', healthCheck);

// POST /api/auth/login — shared login (admin/seller/broker role in JWT)
router.post('/auth/login', login);

// POST /api/auth/register — admin-only account provisioning.
// Path is /api/auth/register (original contract) with authorize('admin') enforced per-route.
router.post('/auth/register', authenticate, authorize('admin'), register);

// POST /api/auth/set-password — authenticated first-login password rotation
router.post('/auth/set-password', authenticate, setPassword);

// POST /api/auth/forgot-password — request 6-digit OTP to reset password (rate-limited)
router.post('/auth/forgot-password', forgotPasswordLimiter, forgotPassword);

// POST /api/auth/verify-otp — verify OTP and receive short-lived reset token
router.post('/auth/verify-otp', verifyOtp);

// POST /api/auth/reset-password — set new password with verified reset token
router.post('/auth/reset-password', resetPassword);

// POST /api/enquiries — public lead capture (seller-website forms)
router.post('/enquiries', createEnquiry);

export default router;
