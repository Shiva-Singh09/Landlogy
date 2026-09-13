import { Router } from 'express';
import { healthCheck } from '../../controllers/common/healthController.js';
import { login, setPassword, register } from '../../controllers/common/authController.js';
import { authenticate, authorize } from '../../middleware/auth.js';
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

// POST /api/enquiries — public lead capture (seller-website forms)
router.post('/enquiries', createEnquiry);

export default router;
