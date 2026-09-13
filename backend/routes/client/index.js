import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { getMe, listProperties, getProperty } from '../../controllers/client/clientController.js';

const router = Router();

// Seller-only authorization applies to every route in this module.
const sellerOnly = [authenticate, authorize('seller')];

router.get('/me', sellerOnly, getMe);
router.get('/properties', sellerOnly, listProperties);            // owner always derived server-side
router.get('/properties/:id', sellerOnly, getProperty);          // foreign property → 404

export default router;
