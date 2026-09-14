import fs from 'fs';
import path from 'path';
import db from '../../models/index.js';
import { upload, UPLOAD_DIR } from '../../config/upload.js';
import { PROPERTY_STATUSES } from '../../utils/constants.js';
import { clean } from '../../utils/validation.js';

// ── Admin Property Management ────────────────────────────────────

// POST /api/properties — Property Submission (Admin only)
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

    // Validate property_type_id if provided
    let propertyTypeId = null;
    if (b.property_type_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_type_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property type ID format.' });
      }
      const propertyType = await db.PropertyType.findByPk(b.property_type_id);
      if (!propertyType) {
        return res.status(400).json({ ok: false, error: 'Property type not found.' });
      }
      propertyTypeId = b.property_type_id;
    }

    // Validate property_category_id if provided
    let propertyCategoryId = null;
    if (b.property_category_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.property_category_id)) {
        return res.status(400).json({ ok: false, error: 'Invalid property category ID format.' });
      }
      const propertyCategory = await db.PropertyCategory.findByPk(b.property_category_id);
      if (!propertyCategory) {
        return res.status(400).json({ ok: false, error: 'Property category not found.' });
      }
      propertyCategoryId = b.property_category_id;
    }

    // SECURITY: Derive owner_id from authenticated user — never trust client-provided ownership
    const ownerId = req.user.id;

    // Create property with initial status 'under_review'
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
      status_history: [{ status: 'under_review', at: new Date().toISOString(), by: ownerId }],
    });

    console.log(`[PROPERTY] Created: ${property.id} by admin ${ownerId}`);

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
    console.error('[PROPERTY] Create failed:', err?.message || err);
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

    // Create PropertyImage record
    const image = await db.PropertyImage.create({
      property_id: id,
      url: imageUrl,
      caption: req.body.caption ? String(req.body.caption).slice(0, 200) : null,
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
      sort_order: parseInt(req.body.sort_order, 10) || 0,
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
    // Clean up uploaded file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
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

    // Verify property exists
    const property = await db.Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    // Fetch images ordered by sort_order
    const images = await db.PropertyImage.findAll({
      where: { property_id: id },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });

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

    // Verify property exists
    const property = await db.Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ ok: false, error: 'Property not found.' });
    }

    // Find image and verify it belongs to the property
    const image = await db.PropertyImage.findOne({
      where: { id: imageId, property_id: propertyId },
    });

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
// GET /api/admin/properties — List properties (Admin only)
export const listProperties = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, property_type_id, city, state, search } = req.query || {};
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
      ];
    }
    // findAndCountAll: one COUNT + one page of rows on the warm pool
    // connection (heavy status_history JSONB excluded from the list).
    const { count, rows } = await db.Property.findAndCountAll({
      where,
      attributes: ['id', 'title', 'description', 'city', 'state', 'asking_price', 'status', 'property_type_id', 'property_category_id', 'owner_id', 'reviewed_by', 'created_at', 'updated_at'],
      order: [['created_at', 'DESC']],
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
export const getProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    }
    const property = await db.Property.findByPk(id);
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
    });
  } catch (err) {
    console.error('[ADMIN] Failed to get property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property right now. Please try again later.' });
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

