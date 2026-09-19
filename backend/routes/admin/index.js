import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { listEnquiries, getEnquiry, updateEnquiryStatus } from '../../controllers/admin/adminEnquiryController.js';
import { getDashboardSummary } from '../../controllers/admin/adminDashboardController.js';
import { getAnalytics } from '../../controllers/admin/adminAnalyticsController.js';
import { getAdminProfile } from '../../controllers/admin/adminProfileController.js';
import { listClients, getClient, updateClientStatus } from '../../controllers/admin/adminClientController.js';
import { listPropertyTypes, listPropertyCategories } from '../../controllers/admin/adminReferenceController.js';
import { listActivity } from '../../controllers/admin/adminActivityController.js';
import { createProperty, listProperties, getProperty, updateProperty, updatePropertyStatus, deleteProperty, uploadImage, listImages, deleteImage, setPrimaryImage, reorderImages } from '../../controllers/admin/adminPropertyController.js';
import { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead } from '../../controllers/admin/adminNotificationController.js';
import { getPushConfig, saveSubscription, removeSubscription, notificationTarget } from '../../controllers/admin/adminPushController.js';
import { upload } from '../../config/upload.js';

const router = Router();

// Admin-only authorization applies to every route in this module.
const adminOnly = [authenticate, authorize('admin')];

// ── Current admin profile ──
router.get('/me', adminOnly, getAdminProfile);

// ── Dashboard ──
router.get('/dashboard/summary', adminOnly, getDashboardSummary);

// ── Analytics (range-complete DB aggregation for the selected 7/30/90 window) ──
router.get('/analytics', adminOnly, getAnalytics);

// ── Activity (read-only history of real backend operations) ──
router.get('/activity', adminOnly, listActivity);

// ── Enquiries ──
router.get('/enquiries', adminOnly, listEnquiries);
router.get('/enquiries/:id', adminOnly, getEnquiry);
router.patch('/enquiries/:id/status', adminOnly, updateEnquiryStatus); // 'converted' provisions the Seller

// ── Clients (sellers) ──
router.get('/clients', adminOnly, listClients);
router.get('/clients/:id', adminOnly, getClient);
router.patch('/clients/:id/status', adminOnly, updateClientStatus);

// ── Properties (create/list/detail/update/status/delete) ──
router.post('/properties', adminOnly, createProperty);
router.get('/properties', adminOnly, listProperties);
router.get('/properties/:id', adminOnly, getProperty);
router.patch('/properties/:id', adminOnly, updateProperty);
router.patch('/properties/:id/status', adminOnly, updatePropertyStatus);
router.delete('/properties/:id', adminOnly, deleteProperty);

// ── Notifications ──
router.get('/notifications/push/config', adminOnly, getPushConfig);
router.post('/notifications/push/subscriptions', adminOnly, saveSubscription);
router.delete('/notifications/push/subscriptions', adminOnly, removeSubscription);
router.get('/notifications/:id/target', adminOnly, notificationTarget);
router.get('/notifications', adminOnly, listNotifications);
router.get('/notifications/unread-count', adminOnly, unreadCount);
router.patch('/notifications/read-all', adminOnly, markAllNotificationsRead);
router.patch('/notifications/:id/read', adminOnly, markNotificationRead);

// ── Property reference data (read-only dropdowns) ──
router.get('/property-types', adminOnly, listPropertyTypes);
router.get('/property-categories', adminOnly, listPropertyCategories);

// ── Property images ──
router.post('/properties/:id/images', adminOnly, upload.single('image'), uploadImage);
router.get('/properties/:id/images', adminOnly, listImages);
router.patch('/properties/:propertyId/images/reorder', adminOnly, reorderImages);
router.patch('/properties/:propertyId/images/:imageId/primary', adminOnly, setPrimaryImage);
router.delete('/properties/:propertyId/images/:imageId', adminOnly, deleteImage);

export default router;
