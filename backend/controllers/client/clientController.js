import fs from 'fs';
import db from '../../models/index.js';
import {
  safeClientProperty, UUID_RE, getCachedPropertyType, getCachedPropertyCategory,
} from '../../services/client/sellerProvisioning.js';
import { clean } from '../../utils/validation.js';
import { createNotification, notifyAdmins, NOTIFICATION_TYPES } from '../../services/common/notificationService.js';
import { storage } from '../../config/storage.js';
import { generateImageFilename } from '../../config/upload.js';

// ── GET /api/client/me (Seller only) ─────────────────────────────
export const getMe = async (req, res) => {
  return res.json({
    ok: true,
    user: {
      id: req.user.id, name: req.user.name, email: req.user.email,
      phone: req.user.phone, role: req.user.role, status: req.user.status,
      force_password_change: req.user.force_password_change,
    },
  });
};

// ── POST /api/client/properties (Seller only; owner derived server-side) ──
// Creates a Seller-owned property starting in 'under_review'. Admin keeps
// final authority over status transitions.
export const createProperty = async (req, res) => {
  try {
    const b = req.body || {};

    // Extract and sanitize string fields (same limits as the Admin property workflow).
    const title = clean(b.title, 200);
    const description = clean(b.description, 5000) || null;
    const address = clean(b.address, 300) || null;
    const city = clean(b.city, 120) || null;
    const state = clean(b.state, 120) || null;
    const pincode = clean(b.pincode, 10) || null;

    // Required: title
    if (!title || title.length < 3) {
      return res.status(400).json({ ok: false, error: 'Property title is required (min 3 characters).' });
    }

    // Optional pincode: digits only, sensible length
    if (pincode && !/^[0-9]{4,10}$/.test(pincode)) {
      return res.status(400).json({ ok: false, error: 'Invalid pincode. Must be 4-10 digits.' });
    }

    // Optional numeric fields with same bounds as Admin create
    let latitude = null;
    if (b.latitude !== undefined && b.latitude !== null && b.latitude !== '') {
      latitude = parseFloat(b.latitude);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ ok: false, error: 'Invalid latitude. Must be between -90 and 90.' });
      }
    }

    let longitude = null;
    if (b.longitude !== undefined && b.longitude !== null && b.longitude !== '') {
      longitude = parseFloat(b.longitude);
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ ok: false, error: 'Invalid longitude. Must be between -180 and 180.' });
      }
    }

    let askingPrice = null;
    if (b.asking_price !== undefined && b.asking_price !== null && b.asking_price !== '') {
      askingPrice = parseFloat(b.asking_price);
      if (isNaN(askingPrice) || askingPrice < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid asking price. Must be a non-negative number.' });
      }
    }

    // Optional property_type_id: UUID format + must exist. Reference data is
    // static, so a short in-process cache avoids a DB round-trip per create.
    let propertyTypeId = null;
    if (b.property_type_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_type_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property type ID format.' });
      }
      const propertyType = await getCachedPropertyType(b.property_type_id);
      if (!propertyType) {
        return res.status(400).json({ ok: false, error: 'Property type not found.' });
      }
      propertyTypeId = b.property_type_id;
    }

    // Optional property_category_id: UUID format + must exist (same cache).
    let propertyCategoryId = null;
    if (b.property_category_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_category_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property category ID format.' });
      }
      const propertyCategory = await getCachedPropertyCategory(b.property_category_id);
      if (!propertyCategory) {
        return res.status(400).json({ ok: false, error: 'Property category not found.' });
      }
      propertyCategoryId = b.property_category_id;
    }

    // SECURITY: ownership always derived from the authenticated Seller.
    // Never trust owner_id/status/status_history/reviewed_by from the client.
    const ownerId = req.user.id;
    const initialHistory = [{ status: 'under_review', at: new Date().toISOString(), by: ownerId }];

    const property = await db.sequelize.transaction(async (transaction) => {
    const created = await db.Property.create({
      owner_id: ownerId,
      property_type_id: propertyTypeId,
      property_category_id: propertyCategoryId,
      title,
      description,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      asking_price: askingPrice,
      status: 'under_review',
      status_history: initialHistory,
    }, { transaction });
        await notifyAdmins({
      type: NOTIFICATION_TYPES.PROPERTY_REVIEW,
      title: 'Property awaiting review', message: created.title,
      related_entity_type: 'property', related_entity_id: created.id,
    }, { transaction });
    return created;
    });

  // Seller notification (in-app + push). Created AFTER the property transaction
  // commits so a failed notification can never roll back the property or be
  // created for a rolled-back row. createNotification() is fire-and-forget:
  // delivery failure is logged/swallowed and never fails the business operation.
  // Owner is derived server-side from the JWT — never from the request body.
  void createNotification({
    recipient_user_id: ownerId,
    type: NOTIFICATION_TYPES.PROPERTY_SUBMITTED,
    title: 'Property submitted for review',
    message: property.title,
    related_entity_type: 'property',
    related_entity_id: property.id,
  });

    console.log(`[CLIENT] Property created: ${property.id} by seller ${ownerId}`);

    // Safe client-visible response (same allowlist as list/detail).
    return res.status(201).json({ ok: true, property: safeClientProperty(property) });
  } catch (err) {
    console.error('[CLIENT] Property create failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to create property right now. Please try again later.' });
  }
};

const CLIENT_PROPERTY_ATTRS = ['id', 'owner_id', 'property_type_id', 'property_category_id', 'title', 'description', 'address', 'city', 'state', 'pincode', 'latitude', 'longitude', 'asking_price', 'status', 'created_at', 'updated_at'];

// ── GET /api/client/properties (Seller only; owner derived server-side) ──
export const listProperties = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 20));
    const ownerId = req.user.id;
    // Single round-trip: findAndCountAll issues the filtered COUNT + the page
    // rows on the warmed pool connection instead of two sequential queries.
    const { count, rows } = await db.Property.findAndCountAll({
      where: { owner_id: ownerId },
      attributes: CLIENT_PROPERTY_ATTRS,
      order: [['created_at', 'DESC']],
      limit: limitNum, offset: (pageNum - 1) * limitNum,
    });

    // ── COVER image resolution (additive; list endpoint only) ─────────
    // One batched query for the whole page (never per-row): each property's
    // canonical image is its `property_images.is_primary = true` row; when a
    // property has no primary, the lowest `sort_order` (then created_at, then
    // id) is the deterministic fallback; no images → `primary_image: null` and
    // the card keeps its existing placeholder.
    const propertyIds = rows.map((row) => row.id);
    const coverByProperty = new Map();
    if (propertyIds.length > 0) {
      const images = await db.PropertyImage.findAll({
        where: { property_id: propertyIds },
        attributes: ['id', 'property_id', 'url', 'is_primary', 'sort_order', 'created_at'],
        order: [['sort_order', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']],
      });
      for (const img of images) {
        const current = coverByProperty.get(img.property_id);
        // Rows arrive in the deterministic order above, so the first primary
        // seen is the lowest-ordered primary and the first row seen is the
        // lowest-ordered image — both are stable choices.
        if (!current || (!current.is_primary && img.is_primary)) {
          coverByProperty.set(img.property_id, img);
        }
      }
    }

    return res.json({
      ok: true,
      // `safeClientProperty` remains the allowlist source of truth; the cover
      // URL is attached additively per property so no other response changes.
      properties: rows.map((row) => ({
        ...safeClientProperty(row),
        primary_image: coverByProperty.get(row.id)?.url || null,
      })),
      pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    console.error('[CLIENT] Failed to list properties:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve properties right now. Please try again later.' });
  }
};

// ── GET /api/client/properties/:id (Seller only; ownership enforced) ──
export const getProperty = async (req, res) => {
  try {
    const cid = req.params.id;
    if (!UUID_RE.test(cid)) return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    // Property and its images are independent reads — fetch in parallel. Non-
    // owned property still yields a 404; the discarded image rows are never
    // exposed, so owner scoping is unchanged.
    const [property, images] = await Promise.all([
      db.Property.findOne({ where: { id: cid, owner_id: req.user.id }, attributes: CLIENT_PROPERTY_ATTRS }),
      db.PropertyImage.findAll({
        where: { property_id: cid }, attributes: ['id', 'url', 'caption', 'is_primary', 'sort_order'], order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      }),
    ]);
    if (!property) return res.status(404).json({ ok: false, error: 'Property not found.' });
    return res.json({
      ok: true,
      property: {
        ...safeClientProperty(property),
        images: images.map((img) => ({ id: img.id, url: img.url, caption: img.caption, is_primary: img.is_primary, sort_order: img.sort_order })),
            },
    });
  } catch (err) {
    console.error('[CLIENT] Failed to get property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property right now. Please try again later.' });
  }
};

// ── Safe projection for a property image — never expose owner/internal columns ──
const safeClientImage = (img) => ({
  id: img.id,
  url: img.url,
  caption: img.caption,
  is_primary: img.is_primary,
  sort_order: img.sort_order,
  created_at: img.created_at,
});

// Remove uploaded temp files from disk. `keep` = paths already persisted to DB.
const cleanupUploadedFiles = (files, keep = new Set()) => {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  for (const f of list) {
    try {
      if (f?.path && !keep.has(f.path)) fs.unlinkSync(f.path);
    } catch {}
  }
};

// ── POST /api/client/properties/:id/images (Seller only) ────────────────────────
// Adds one or more images to a property the authenticated Seller owns. Ownership is
// resolved as `property.owner_id === req.user.id`; foreign properties 404 so their
// existence is not disclosed. Reuses the project's `uploadMulti` instance (same
// disk storage / MIME allow-list / 5 MB per-file cap as the Admin flow) with field
// name "image". Property ownership, status, reviewed_by and status_history are
// never written here — they are immutable from this endpoint.
export const uploadImages = async (req, res) => {
  const pid = req.params.id;
  const files = Array.isArray(req.files) ? req.files : req.files ? [req.files] : [];
  let persistedPaths = new Set();

  try {
    if (!UUID_RE.test(pid)) {
      cleanupUploadedFiles(files);
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }

    // Ownership enforced at the query — only the Seller's own property is accepted.
    const property = await db.Property.findOne({ where: { id: pid, owner_id: req.user.id } });
    if (!property) {
      cleanupUploadedFiles(files);
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    if (!files.length) {
      return res.status(400).json({ ok: false, error: 'No image files provided. Use field name "image".' });
    }

    // ── Storage driver: supabase → push buffers to the bucket first, then
    // persist rows. local → legacy on-disk behaviour is untouched below. ──
    if (storage.driver === 'supabase') {
      const isPrimaryFlagSupa = req.body.is_primary === 'true' || req.body.is_primary === true;
      const lastOrderSupa = await db.PropertyImage.max('sort_order', { where: { property_id: pid } });
      const baseOrderSupa = (Number.isInteger(lastOrderSupa) && lastOrderSupa > 0 ? lastOrderSupa : 0) + 1;

      // Keep a single primary per property (same rule as local mode).
      if (isPrimaryFlagSupa) {
        await db.PropertyImage.update({ is_primary: false }, { where: { property_id: pid, is_primary: true } });
      }

      const uploaded = []; // { objectPath } — cleaned up if the operation fails
      const saved = [];
      try {
        for (let i = 0; i < files.length; i += 1) {
          const filename = generateImageFilename(files[i].mimetype);
          const { objectPath, publicUrl } = await storage.uploadPropertyImage({
            propertyId: pid,
            buffer: files[i].buffer,
            mimetype: files[i].mimetype,
            filename,
          });
          uploaded.push({ objectPath }); // pending cleanup if this row never persists
          const image = await db.PropertyImage.create({
            property_id: pid,
            url: publicUrl, // absolute HTTPS URL stored directly in property_images.url
            caption: clean(req.body.caption, 200) || null,
            is_primary: isPrimaryFlagSupa && i === 0,
            sort_order: baseOrderSupa + i,
          });
          saved.push(safeClientImage(image));
          uploaded.pop(); // persisted → exclude from any later failure cleanup
        }
      } catch (upErr) {
        // Best-effort cleanup of every object uploaded during this request.
        for (const u of uploaded) await storage.removeObjectPath(u.objectPath);
        console.error('[CLIENT] Failed to upload property images (supabase):', upErr?.message || upErr);
        return res.status(502).json({ ok: false, error: 'Unable to upload images right now. Please try again later.' });
      }

      console.log(`[CLIENT] Uploaded ${saved.length} image(s) to storage for property ${pid} by seller ${req.user.id}`);
      return res.status(201).json({ ok: true, images: saved });
    }

    const isPrimaryFlag = req.body.is_primary === 'true' || req.body.is_primary === true;

    const lastOrder = await db.PropertyImage.max('sort_order', { where: { property_id: pid } });
    const baseOrder = (Number.isInteger(lastOrder) && lastOrder > 0 ? lastOrder : 0) + 1;

    // Keep a single primary per property (Seller-only convenience; Admin route untouched).
    if (isPrimaryFlag) {
      await db.PropertyImage.update({ is_primary: false }, { where: { property_id: pid, is_primary: true } });
    }

    const saved = [];
    for (let i = 0; i < files.length; i += 1) {
      const image = await db.PropertyImage.create({
        property_id: pid,
        url: `/uploads/${files[i].filename}`,
        caption: clean(req.body.caption, 200) || null,
        is_primary: isPrimaryFlag && i === 0,
        sort_order: baseOrder + i,
      });
      persistedPaths.add(files[i].path);
      saved.push(safeClientImage(image));
    }

    console.log(`[CLIENT] Uploaded ${saved.length} image(s) for property ${pid} by seller ${req.user.id}`);
    return res.status(201).json({ ok: true, images: saved });
  } catch (err) {
    cleanupUploadedFiles(files, persistedPaths);
    console.error('[CLIENT] Failed to upload property images:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to upload images right now. Please try again later.' });
  }
};
