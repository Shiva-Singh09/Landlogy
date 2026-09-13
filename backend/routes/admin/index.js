import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { listEnquiries, getEnquiry, updateEnquiryStatus } from '../../controllers/admin/adminEnquiryController.js';
import { listProperties, getProperty, updatePropertyStatus, uploadImage, listImages, deleteImage } from '../../controllers/admin/adminPropertyController.js';
import { upload } from '../../config/upload.js';

const router = Router();

// Admin-only authorization applies to every route in this module.
const adminOnly = [authenticate, authorize('admin')];

// ── Enquiries ──
router.get('/enquiries', adminOnly, listEnquiries);
router.get('/enquiries/:id', adminOnly, getEnquiry);
router.patch('/enquiries/:id/status', adminOnly, updateEnquiryStatus); // 'converted' provisions the Seller

// ── Properties (list/detail/status) ──
router.get('/properties', adminOnly, listProperties);
router.get('/properties/:id', adminOnly, getProperty);
router.patch('/properties/:id/status', adminOnly, updatePropertyStatus);

// ── Property images ──
router.post('/properties/:id/images', adminOnly, upload.single('image'), uploadImage);
router.get('/properties/:id/images', adminOnly, listImages);
router.delete('/properties/:propertyId/images/:imageId', adminOnly, deleteImage);

export default router;
