import fs from 'fs';
import path from 'path';
import db from '../../models/index.js';
import { UPLOAD_DIR } from '../../config/upload.js';
import { PROPERTY_STATUSES } from '../../utils/constants.js';
import { clean } from '../../utils/validation.js';
import { recordActivity, describeActivity, ACTIVITY_ACTIONS, buildActivityRecord } from '../../services/common/activityLog.js';

// ── Admin Property Management ────────────────────────────────────

// POST /api/admin/properties — Create property (Admin only)
// Owner is explicit (Seller/Client id). Status always starts as 'draft' —
// Admin changes it later via PATCH /:id/status.
export const createProperty = async (req, res) => {
  try {
    const b = req.body || {};

    // Extract and sanitize string fields
    const title = clean(b.title, 200);
    const description = clean(b.description, 5000) || null;
    const address = clean(b.address, 300) || null;
    const city = clean(b.city, 120) || null;
    const state = clean(b.state, 120) || null;
    const pincode = clean(b.pincode, 10) || null;

    // Validate required fields
    if (!title || title.length < 3) {
      return res.status(400).json({ ok: false, error: 'Property title is required (min 3 characters).' });
    }

    // Optional pincode: digits only, sensible length (same rule as Seller flow)
    if (pincode && !/^[0-9]{4,10}$/.test(pincode)) {
      return res.status(400).json({ ok: false, error: 'Invalid pincode. Must be 4-10 digits.' });
    }

    // Validate and parse numeric fields
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

    // Reference IDs: format-check both first, then resolve both FK rows in ONE
    // round trip. The remote DB costs ~0.4s per round trip, so sequential
    // existence checks would add a full round trip to every create.
    // Validation precedence is unchanged: type is reported before category.
    // Validate the owner before any database lookup.
    let ownerId = null;
    if (!b.owner_id) return res.status(400).json({ ok: false, error: 'Seller/Client (owner) is required.' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.owner_id)) {
      return res.status(400).json({ ok: false, error: 'Invalid Seller/Client ID format.' });
    }
    let propertyTypeId = null;
    let propertyCategoryId = null;
    if (b.property_type_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_type_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property type ID format.' });
      }
    }
    if (b.property_category_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_category_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property category ID format.' });
      }
    }
    if (b.property_type_id || b.property_category_id || b.owner_id) {
      const [propertyType, propertyCategory, owner] = await Promise.all([
        b.property_type_id ? db.PropertyType.findByPk(b.property_type_id, { attributes: ['id'] }) : null,
        b.property_category_id ? db.PropertyCategory.findByPk(b.property_category_id, { attributes: ['id'] }) : null,
        db.User.findOne({ where: { id: b.owner_id, role: 'seller' }, attributes: ['id'] }),
      ]);
      if (b.property_type_id && !propertyType) {
        return res.status(400).json({ ok: false, error: 'Property type not found.' });
      }
      if (b.property_category_id && !propertyCategory) {
        return res.status(400).json({ ok: false, error: 'Property category not found.' });
      }
      if (!owner) {
        return res.status(400).json({ ok: false, error: 'Seller/Client not found.' });
      }
      ownerId = b.owner_id;
      if (propertyType) propertyTypeId = b.property_type_id;
      if (propertyCategory) propertyCategoryId = b.property_category_id;
    }


    // Create property with initial status 'under_review' (matches existing Admin
    // review workflow; the /:id/status endpoint governs later transitions).
    const property = await db.Property.create({
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
      status_history: [{ status: 'under_review', at: new Date().toISOString(), by: req.user.id }],
    });

    console.log(`[ADMIN] Property created: ${property.id} owner ${ownerId} by admin ${req.user.id}`);
    recordActivity(ACTIVITY_ACTIONS.PROPERTY_CREATED, {
      actorUserId: req.user.id,
      entityType: 'property',
      entityId: property.id,
      description: describeActivity(ACTIVITY_ACTIONS.PROPERTY_CREATED, { label: property.title }),
    });

    // Return safe public fields (exclude internal fields)
    return res.status(201).json({
      ok: true,
      property: {
        id: property.id,
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        latitude: property.latitude,
        longitude: property.longitude,
        asking_price: property.asking_price,
        property_type_id: property.property_type_id,
        property_category_id: property.property_category_id,
        status: property.status,
        created_at: property.created_at,
        updated_at: property.updated_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Create property failed:', err?.message || err);
    // FK race (Seller removed between lookup and insert) surfaces as 400.
    if (err?.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ ok: false, error: 'Seller/Client not found.' });
    }
    return res.status(502).json({ ok: false, error: 'Unable to create property right now. Please try again later.' });
  }
};

// ── Admin Property Image Management ──────────────────────────────

// POST /api/admin/properties/:id/images — Upload property image (Admin only)
export const uploadImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }

    // Verify property exists
    const property = await db.Property.findByPk(id);
    if (!property) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    // Check file was uploaded
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No image file provided. Use field name "image".' });
    }

    // Build relative URL for storage
    const imageUrl = `/uploads/${req.file.filename}`;

    // Keep a single primary per property when the caller marks this upload as
    // primary. sort_order appends after the current max (same as Seller flow).
    const isPrimary = req.body.is_primary === 'true' || req.body.is_primary === true;
    if (isPrimary) {
      await db.PropertyImage.update({ is_primary: false }, { where: { property_id: id, is_primary: true } });
    }
    const lastOrder = await db.PropertyImage.max('sort_order', { where: { property_id: id } });
    const requestedOrder = parseInt(req.body.sort_order, 10);
    const sortOrder = Number.isInteger(requestedOrder) && requestedOrder > 0
      ? requestedOrder
      : ((Number.isInteger(lastOrder) && lastOrder > 0 ? lastOrder : 0) + 1);

    // Create PropertyImage record
    const image = await db.PropertyImage.create({
      property_id: id,
      url: imageUrl,
      caption: req.body.caption ? String(req.body.caption).slice(0, 200) : null,
      is_primary: isPrimary,
      sort_order: sortOrder,
    });

    console.log(`[ADMIN] Image uploaded for property ${id}: ${image.id}`);

    return res.status(201).json({
      ok: true,
      image: {
        id: image.id,
        property_id: image.property_id,
        url: image.url,
        caption: image.caption,
        is_primary: image.is_primary,
        sort_order: image.sort_order,
        created_at: image.created_at,
      },
    });
  } catch (err) {
    // Multer rejection (MIME / 5 MB size) arrives here as an Error because the
    // admin image route has no dedicated error mapper. Convert the known cases
    // to matching JSON statuses; delete any stray file.
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, error: 'File too large. Maximum size is 5 MB.' });
    }
    if (/unsupported file type/i.test(err?.message || '')) {
      return res.status(400).json({ ok: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WebP.' });
    }
    console.error('[ADMIN] Failed to upload image:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to upload image right now. Please try again later.' });
  }
};

// GET /api/admin/properties/:id/images — List property images (Admin only)
export const listImages = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }

    // Property existence + image list are independent reads: run both in one
    // remote round trip (~0.4s each against the pooler) instead of two.
    const [property, images] = await Promise.all([
      db.Property.findByPk(id, { attributes: ['id'] }),
      db.PropertyImage.findAll({
        where: { property_id: id },
        order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      }),
    ]);

    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    return res.json({
      ok: true,
      images: images.map((img) => ({
        id: img.id,
        property_id: img.property_id,
        url: img.url,
        caption: img.caption,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        created_at: img.created_at,
      })),
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list images:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve images right now. Please try again later.' });
  }
};

// DELETE /api/admin/properties/:propertyId/images/:imageId — Delete property image (Admin only)
export const deleteImage = async (req, res) => {
  try {
    const { propertyId, imageId } = req.params;

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    if (!uuidRegex.test(imageId)) {
      return res.status(400).json({ ok: false, error: 'Invalid image ID format.' });
    }

    // Property existence + image lookup are independent reads: one round trip.
    const [property, image] = await Promise.all([
      db.Property.findByPk(propertyId, { attributes: ['id'] }),
      db.PropertyImage.findOne({
        where: { id: imageId, property_id: propertyId },
      }),
    ]);

    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    if (!image) {
      return res.status(404).json({ ok: false, error: 'Image not found.' });
    }

    // Delete stored file
    const filePath = path.join(UPLOAD_DIR, path.basename(image.url));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error('[ADMIN] Failed to delete image file:', fileErr?.message || fileErr);
      // Continue to delete DB record even if file deletion fails
    }

    // Delete database record
    await image.destroy();

    console.log(`[ADMIN] Image deleted: ${imageId} from property ${propertyId}`);

    return res.json({ ok: true, message: 'Image deleted successfully.' });
  } catch (err) {
    console.error('[ADMIN] Failed to delete image:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to delete image right now. Please try again later.' });
  }
};

// PATCH /api/admin/properties/:propertyId/images/:imageId/primary — Set primary image (Admin only)
// Clears the existing primary for the property, then marks the target image.
export const setPrimaryImage = async (req, res) => {
  try {
    const { propertyId, imageId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    if (!uuidRegex.test(imageId)) {
      return res.status(400).json({ ok: false, error: 'Invalid image ID format.' });
    }
    const [property, image] = await Promise.all([
      db.Property.findByPk(propertyId, { attributes: ['id'] }),
      db.PropertyImage.findOne({ where: { id: imageId, property_id: propertyId } }),
    ]);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    if (!image) {
      return res.status(404).json({ ok: false, error: 'Image not found.' });
    }
    await db.PropertyImage.update({ is_primary: false }, { where: { property_id: propertyId, is_primary: true } });
    image.is_primary = true;
    await image.save();
    return res.json({
      ok: true,
      image: {
        id: image.id,
        property_id: image.property_id,
        url: image.url,
        caption: image.caption,
        is_primary: image.is_primary,
        sort_order: image.sort_order,
        created_at: image.created_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to set primary image:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update the primary image right now. Please try again later.' });
  }
};

// PATCH /api/admin/properties/:propertyId/images/reorder — Reorder images (Admin only)
// Body: { order: [imageId, ...] } covering exactly the property's current image set.
export const reorderImages = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    const order = req.body?.order;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ ok: false, error: 'Image order is required.' });
    }
    for (const imageId of order) {
      if (typeof imageId !== 'string' || !uuidRegex.test(imageId)) {
        return res.status(400).json({ ok: false, error: 'Invalid image ID in order.' });
      }
    }
    const property = await db.Property.findByPk(propertyId, { attributes: ['id'] });
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    const images = await db.PropertyImage.findAll({ where: { property_id: propertyId }, attributes: ['id'] });
    const currentIds = new Set(images.map((img) => img.id));
    if (order.length !== images.length || !order.every((imageId) => currentIds.has(imageId))) {
      return res.status(400).json({ ok: false, error: 'Image order must include exactly the current images.' });
    }
    await db.sequelize.transaction(async (t) => {
      for (let index = 0; index < order.length; index += 1) {
        await db.PropertyImage.update({ sort_order: index + 1 }, { where: { id: order[index], property_id: propertyId }, transaction: t });
      }
    });
    const updated = await db.PropertyImage.findAll({
      where: { property_id: propertyId },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });
    return res.json({
      ok: true,
      images: updated.map((img) => ({
        id: img.id,
        property_id: img.property_id,
        url: img.url,
        caption: img.caption,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        created_at: img.created_at,
      })),
    });
  } catch (err) {
    console.error('[ADMIN] Failed to reorder images:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to reorder images right now. Please try again later.' });
  }
};
// GET /api/admin/properties — List properties (Admin only)
// Filters/search/sort are DB-level. Sortable fields are allow-listed; the
// response shape is unchanged: { ok, properties, pagination }.
const PROPERTY_SORT_FIELDS = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  asking_price: 'asking_price',
  title: 'title',
};
export const listProperties = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, property_type_id, property_category_id, city, state, min_price, max_price, search, sort_by = 'created_at', sort_dir = 'DESC' } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const where = {};
    if (status) {
      if (!PROPERTY_STATUSES.includes(status)) {
        return res.status(400).json({ ok: false, error: `Invalid status. Allowed values: ${PROPERTY_STATUSES.join(', ')}.` });
      }
      where.status = status;
    }
    if (property_type_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property_type_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property type ID format.' });
      }
      where.property_type_id = property_type_id;
    }
    if (property_category_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property_category_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property category ID format.' });
      }
      where.property_category_id = property_category_id;
    }
    if (min_price !== undefined && min_price !== null && min_price !== '') {
      const min = parseFloat(min_price);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid min_price. Must be a non-negative number.' });
      }
      where.asking_price = { ...(where.asking_price || {}), [db.Sequelize.Op.gte]: min };
    }
    if (max_price !== undefined && max_price !== null && max_price !== '') {
      const max = parseFloat(max_price);
      if (isNaN(max) || max < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid max_price. Must be a non-negative number.' });
      }
      where.asking_price = { ...(where.asking_price || {}), [db.Sequelize.Op.lte]: max };
    }
    if (city) {
      where.city = { [db.Sequelize.Op.iLike]: `%${String(city).trim()}%` };
    }
    if (state) {
      where.state = { [db.Sequelize.Op.iLike]: `%${String(state).trim()}%` };
    }
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: searchTerm } },
        { address: { [db.Sequelize.Op.iLike]: searchTerm } },
        { city: { [db.Sequelize.Op.iLike]: searchTerm } },
        { pincode: { [db.Sequelize.Op.iLike]: searchTerm } },
      ];
    }
    // Sort is allow-listed — arbitrary sort_by values are rejected, never
    // interpolated into the query.
    const sortField = PROPERTY_SORT_FIELDS[String(sort_by || '').toLowerCase()] || null;
    if (!sortField) {
      return res.status(400).json({ ok: false, error: `Invalid sort_by. Allowed values: ${Object.keys(PROPERTY_SORT_FIELDS).join(', ')}.` });
    }
    const sortDir = String(sort_dir || '').toUpperCase() === 'ASC' ? 'ASC' : String(sort_dir || '').toUpperCase() === 'DESC' ? 'DESC' : null;
    if (!sortDir) {
      return res.status(400).json({ ok: false, error: 'Invalid sort_dir. Allowed values: ASC, DESC.' });
    }
    // findAndCountAll: one COUNT + one page of rows on the warm pool
    // connection (heavy status_history JSONB excluded from the list).
    const { count, rows } = await db.Property.findAndCountAll({
      where,
      attributes: ['id', 'title', 'description', 'city', 'state', 'asking_price', 'status', 'property_type_id', 'property_category_id', 'owner_id', 'reviewed_by', 'created_at', 'updated_at'],
      order: [[sortField, sortDir]],
      limit: limitNum,
      offset,
    });
    const properties = rows;
    const safeProperties = properties.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      city: p.city,
      state: p.state,
      asking_price: p.asking_price,
      status: p.status,
      property_type_id: p.property_type_id,
      property_category_id: p.property_category_id,
      owner_id: p.owner_id,
      reviewed_by: p.reviewed_by,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
    return res.json({
      ok: true,
      properties: safeProperties,
      pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list properties:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve properties right now. Please try again later.' });
  }
};

// GET /api/admin/properties/:id — Get property details (Admin only)
// Owner + type/category names are joined here so the detail UI can render
// Seller/Client identity without an extra round trip. Shape is additive:
// existing `property` keys are unchanged; a `related` block is added.
export const getProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    const property = await db.Property.findByPk(id, {
      include: [
        { model: db.User, as: 'owner', attributes: ['id', 'name', 'email', 'phone', 'status'] },
        { model: db.PropertyType, as: 'property_type', attributes: ['id', 'name', 'slug'] },
        { model: db.PropertyCategory, as: 'property_category', attributes: ['id', 'name', 'slug'] },
      ],
    });
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    return res.json({
      ok: true,
      property: {
        id: property.id,
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        latitude: property.latitude,
        longitude: property.longitude,
        asking_price: property.asking_price,
        status: property.status,
        property_type_id: property.property_type_id,
        property_category_id: property.property_category_id,
        owner_id: property.owner_id,
        reviewed_by: property.reviewed_by,
        status_history: property.status_history,
        created_at: property.created_at,
        updated_at: property.updated_at,
      },
      related: {
        owner: property.owner ? {
          id: property.owner.id,
          name: property.owner.name,
          email: property.owner.email,
          phone: property.owner.phone,
          status: property.owner.status,
        } : null,
        property_type: property.property_type ? {
          id: property.property_type.id,
          name: property.property_type.name,
          slug: property.property_type.slug,
        } : null,
        property_category: property.property_category ? {
          id: property.property_category.id,
          name: property.property_category.name,
          slug: property.property_category.slug,
        } : null,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to get property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property right now. Please try again later.' });
  }
};

// PATCH /api/admin/properties/:id — Update property fields (Admin only)
// Allow-list: title, description, address, city, state, pincode, latitude,
// longitude, asking_price, property_type_id, property_category_id, owner_id.
// Protected: id, status, status_history, reviewed_by, timestamps.
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    const property = await db.Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    const b = req.body || {};
    if (b.title !== undefined) {
      const title = clean(b.title, 200);
      if (!title || title.length < 3) {
        return res.status(400).json({ ok: false, error: 'Property title is required (min 3 characters).' });
      }
      property.title = title;
    }
    if (b.description !== undefined) property.description = clean(b.description, 5000) || null;
    if (b.address !== undefined) property.address = clean(b.address, 300) || null;
    if (b.city !== undefined) property.city = clean(b.city, 120) || null;
    if (b.state !== undefined) property.state = clean(b.state, 120) || null;
    if (b.pincode !== undefined) {
      const rawPincode = clean(b.pincode, 10);
      if (rawPincode && !/^[0-9]{4,10}$/.test(rawPincode)) {
        return res.status(400).json({ ok: false, error: 'Invalid pincode. Must be 4-10 digits.' });
      }
      property.pincode = rawPincode || null;
    }
    if (b.latitude !== undefined) {
      if (b.latitude === null || b.latitude === '') property.latitude = null;
      else {
        const latitude = parseFloat(b.latitude);
        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
          return res.status(400).json({ ok: false, error: 'Invalid latitude. Must be between -90 and 90.' });
        }
        property.latitude = latitude;
      }
    }
    if (b.longitude !== undefined) {
      if (b.longitude === null || b.longitude === '') property.longitude = null;
      else {
        const longitude = parseFloat(b.longitude);
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
          return res.status(400).json({ ok: false, error: 'Invalid longitude. Must be between -180 and 180.' });
        }
        property.longitude = longitude;
      }
    }
    if (b.asking_price !== undefined) {
      if (b.asking_price === null || b.asking_price === '') property.asking_price = null;
      else {
        const askingPrice = parseFloat(b.asking_price);
        if (isNaN(askingPrice) || askingPrice < 0) {
          return res.status(400).json({ ok: false, error: 'Invalid asking price. Must be a non-negative number.' });
        }
        property.asking_price = askingPrice;
      }
    }
    // Reference IDs: format-check both, then resolve both FK rows in ONE round
    // trip instead of two (~0.4s saved per edit against the remote pooler).
    const typeInput = b.property_type_id;
    const categoryInput = b.property_category_id;
    if (typeInput !== undefined && typeInput !== null && typeInput !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(typeInput)) {
      return res.status(400).json({ ok: false, error: 'Invalid property type ID format.' });
    }
    if (categoryInput !== undefined && categoryInput !== null && categoryInput !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryInput)) {
      return res.status(400).json({ ok: false, error: 'Invalid property category ID format.' });
    }
    const resolveType = typeInput !== undefined && typeInput !== null && typeInput !== '';
    const resolveCategory = categoryInput !== undefined && categoryInput !== null && categoryInput !== '';
    if (resolveType || resolveCategory) {
      const [typeRow, categoryRow] = await Promise.all([
        resolveType ? db.PropertyType.findByPk(typeInput, { attributes: ['id'] }) : null,
        resolveCategory ? db.PropertyCategory.findByPk(categoryInput, { attributes: ['id'] }) : null,
      ]);
      if (resolveType && !typeRow) {
        return res.status(400).json({ ok: false, error: 'Property type not found.' });
      }
      if (resolveCategory && !categoryRow) {
        return res.status(400).json({ ok: false, error: 'Property category not found.' });
      }
    }
    if (typeInput !== undefined) property.property_type_id = resolveType ? typeInput : null;
    if (categoryInput !== undefined) property.property_category_id = resolveCategory ? categoryInput : null;
    // Owner reassignment: Admin may move a property to a different Seller/Client.
    // Same rule as create: role-scoped lookup, reported as not-found.
    if (b.owner_id !== undefined) {
      if (!b.owner_id) {
        return res.status(400).json({ ok: false, error: 'Seller/Client (owner) is required.' });
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.owner_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid Seller/Client ID format.' });
      }
      const nextOwner = await db.User.findOne({ where: { id: b.owner_id, role: 'seller' }, attributes: ['id'] });
      if (!nextOwner) {
        return res.status(400).json({ ok: false, error: 'Seller/Client not found.' });
      }
      property.owner_id = b.owner_id;
    }
    // NOTE: status/reviewed_by/status_history never written here.
    await property.save();
    console.log(`[ADMIN] Property ${id} updated by admin ${req.user.id}`);
    recordActivity(ACTIVITY_ACTIONS.PROPERTY_UPDATED, {
      actorUserId: req.user.id,
      entityType: 'property',
      entityId: property.id,
      description: describeActivity(ACTIVITY_ACTIONS.PROPERTY_UPDATED, { label: property.title }),
    });
    return res.json({
      ok: true,
      property: {
        id: property.id,
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        latitude: property.latitude,
        longitude: property.longitude,
        asking_price: property.asking_price,
        property_type_id: property.property_type_id,
        property_category_id: property.property_category_id,
        owner_id: property.owner_id,
        status: property.status,
        created_at: property.created_at,
        updated_at: property.updated_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to update property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update property right now. Please try again later.' });
  }
};

// PATCH /api/admin/properties/:id/status — Update property status (Admin only)
export const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    if (!status) {
      return res.status(400).json({ ok: false, error: 'Status is required.' });
    }
    if (!PROPERTY_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: `Invalid status. Allowed values: ${PROPERTY_STATUSES.join(', ')}.` });
    }
    const property = await db.Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    const previousStatus = property.status;
    property.status = status;
    property.reviewed_by = req.user.id;
    // Copy the JSONB array before mutating it — otherwise the in-place push
    // mutates the same array Sequelize snapshots for change tracking, and the
    // status_history write is silently omitted from the UPDATE.
    const history = (property.status_history || []).map((h) => ({ ...h }));
    history.push({ from: previousStatus, to: status, at: new Date().toISOString(), by: req.user.id });
    property.status_history = history;
    await property.save();
    console.log(`[ADMIN] Property ${id} status updated from '${previousStatus}' to '${status}' by admin ${req.user.id}`);
    recordActivity(ACTIVITY_ACTIONS.PROPERTY_STATUS_CHANGED, {
      actorUserId: req.user.id,
      entityType: 'property',
      entityId: property.id,
      description: describeActivity(ACTIVITY_ACTIONS.PROPERTY_STATUS_CHANGED, { label: property.title, from: previousStatus, to: status }),
    });
    return res.json({
      ok: true,
      property: {
        id: property.id,
        status: property.status,
        reviewed_by: property.reviewed_by,
        status_history: property.status_history,
        updated_at: property.updated_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to update property status:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update property status right now. Please try again later.' });
  }
};

// DELETE /api/admin/properties/:id — Delete property (Admin only)
// FK behavior (migrations): property_images + property_commissions CASCADE;
// enquiries.converted_property_id SET NULL. Image files removed from disk
// (DB rows cascade; files have no DB-level cleanup).
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    const property = await db.Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }
    const images = await db.PropertyImage.findAll({ where: { property_id: id }, attributes: ['url'] });
    await property.destroy();
    for (const img of images) {
      try {
        const filename = String(img.url || '').split('/').pop();
        if (!filename || filename.includes('..')) continue;
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error('[ADMIN] Failed to delete property image file:', fileErr?.message || fileErr);
      }
    }
    console.log(`[ADMIN] Property deleted: ${id} by admin ${req.user.id}`);
    // Recorded after a successful destroy; description uses the in-memory title.
    recordActivity(ACTIVITY_ACTIONS.PROPERTY_DELETED, {
      actorUserId: req.user.id,
      entityType: 'property',
      entityId: id,
      description: describeActivity(ACTIVITY_ACTIONS.PROPERTY_DELETED, { label: property.title }),
    });
    return res.json({ ok: true, message: 'Property deleted successfully.' });
  } catch (err) {
    console.error('[ADMIN] Failed to delete property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to delete property right now. Please try again later.' });
  }
};

