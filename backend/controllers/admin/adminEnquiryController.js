import db from '../../models/index.js';
import { ENQUIRY_STATUSES } from '../../utils/constants.js';
import { isValidEmail, enquiryHasLinkage, provisionConversionTx, sendSellerOnboardingEmail } from '../../services/client/sellerProvisioning.js';

// ── Admin Enquiry Management ─────────────────────────────────────

// GET /api/admin/enquiries — List Seller/Client enquiries (Admin only)
export const listEnquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
    } = req.query || {};

    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    // Status filter
    if (status) {
      if (!ENQUIRY_STATUSES.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid status. Allowed values: ${ENQUIRY_STATUSES.join(', ')}.`,
        });
      }
      where.status = status;
    }

    // Search by name, email, or phone
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.iLike]: searchTerm } },
        { email: { [db.Sequelize.Op.iLike]: searchTerm } },
        { phone: { [db.Sequelize.Op.iLike]: searchTerm } },
      ];
    }

    // Query with pagination
    const { count, rows: enquiries } = await db.Enquiry.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Return safe fields only
    const safeEnquiries = enquiries.map((e) => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      email: e.email,
      city: e.city,
      intent: e.intent,
      property_type: e.property_type,
      status: e.status,
      reviewed_by: e.reviewed_by,
      notes: e.notes,
      created_at: e.created_at,
      updated_at: e.updated_at,
    }));

    return res.json({
      ok: true,
      enquiries: safeEnquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list enquiries:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve enquiries right now. Please try again later.' });
  }
};

// GET /api/admin/enquiries/:id — Get single Seller/Client enquiry (Admin only)
export const getEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid enquiry ID format.' });
    }

    const enquiry = await db.Enquiry.findByPk(id);

    if (!enquiry) {
      return res.status(404).json({ ok: false, error: 'Enquiry not found.' });
    }

    // Return complete operational information
    return res.json({
      ok: true,
      enquiry: {
        id: enquiry.id,
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        city: enquiry.city,
        message: enquiry.message,
        intent: enquiry.intent,
        property_type: enquiry.property_type,
        status: enquiry.status,
        reviewed_by: enquiry.reviewed_by,
        notes: enquiry.notes,
        created_at: enquiry.created_at,
        updated_at: enquiry.updated_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to get enquiry:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve enquiry right now. Please try again later.' });
  }
};

// PATCH /api/admin/enquiries/:id/status — Update enquiry status (Admin only)
// 'converted' provisions the Seller/Client account (seller provisioning service).
export const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid enquiry ID format.' });
    }

    // Validate status
    if (!status) {
      return res.status(400).json({ ok: false, error: 'Status is required.' });
    }
    if (!ENQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid status. Allowed values: ${ENQUIRY_STATUSES.join(', ')}.`,
      });
    }

    const enquiry = await db.Enquiry.findByPk(id);

    if (!enquiry) {
      return res.status(404).json({ ok: false, error: 'Enquiry not found.' });
    }

    // Non-conversion statuses keep the original lightweight behaviour.
    if (status !== 'converted') {
      enquiry.status = status;
      enquiry.reviewed_by = req.user.id;
      if (notes !== undefined) {
        enquiry.notes = String(notes).slice(0, 5000);
      }
      await enquiry.save();
      console.log(`[ADMIN] Enquiry ${id} status updated to '${status}' by admin ${req.user.id}`);
      return res.json({
        ok: true,
        enquiry: {
          id: enquiry.id,
          status: enquiry.status,
          reviewed_by: enquiry.reviewed_by,
          notes: enquiry.notes,
          updated_at: enquiry.updated_at,
        },
      });
    }
    // 'converted' = Admin accepts the Seller/Client: provision access.
    const sellerEmail = String(enquiry.email || '').trim().toLowerCase();
    if (!sellerEmail || !isValidEmail(sellerEmail)) {
      return res.status(400).json({ ok: false, error: 'An email address is required on this enquiry before client access can be provisioned. Please update the enquiry with a valid email and retry.' });
    }
    // SPLITPOINT-B
    // Idempotent repeat: already linked to a valid seller+property → reuse.
    if (enquiry.status === 'converted' && enquiryHasLinkage(enquiry) && enquiry.converted_user_id && enquiry.converted_property_id) {
      const [linkedSeller, linkedProperty] = await Promise.all([
        db.User.findByPk(enquiry.converted_user_id),
        db.Property.findByPk(enquiry.converted_property_id),
      ]);
      if (linkedSeller && linkedProperty && String(linkedProperty.owner_id) === String(linkedSeller.id)) {
        if (notes !== undefined) { enquiry.notes = String(notes).slice(0, 5000); }
        enquiry.reviewed_by = req.user.id;
        await enquiry.save();
        return res.json({
          ok: true, idempotent: true,
          enquiry: { id: enquiry.id, status: enquiry.status },
          seller: { id: linkedSeller.id, email: linkedSeller.email },
          property: { id: linkedProperty.id, status: linkedProperty.status },
          onboarding: { email_sent: true, repeated: true, note: 'Already provisioned; existing seller and property reused. No new credentials issued.' },
        });
      }
    }
    // SPLITPOINT-C
    // Provision inside one transaction (seller + property + linkage).
    let conv;
    try {
      conv = await provisionConversionTx({ enquiry, adminId: req.user.id, notes });
    } catch (txErr) {
      if (txErr?.code === 'ROLE_CONFLICT') {
        return res.status(409).json({ ok: false, error: 'This email already belongs to a non-seller account. Client access cannot be provisioned for it.' });
      }
      if (txErr?.code === 'SELLER_INACTIVE') {
        return res.status(409).json({ ok: false, error: 'A seller account with this email exists but is not active. Please reactivate it before converting.' });
      }
      throw txErr;
    }
    // SPLITPOINT-D
    // Onboarding email: external side effect, sent AFTER commit.
    let onboarding;
    if (conv.tempPasswordIssued && conv.tempPassword) {
      const sellerFresh = await db.User.findByPk(conv.seller.id);
      const mail = await sendSellerOnboardingEmail({ toEmail: sellerFresh.email, toName: sellerFresh.name, tempPassword: conv.tempPassword });
      onboarding = mail.sent
        ? { email_sent: true }
        : { email_sent: false, email_error: 'Onboarding email could not be delivered. Seller account and property were created; please resend credentials via a secure channel.' };
      if (mail.sent) console.log(`[ADMIN] Enquiry ${id} converted: seller ${sellerFresh.id}, onboarding sent.`);
      else console.error(`[ADMIN] Enquiry ${id} converted but onboarding email failed (seller ${sellerFresh.id}).`);
    } else {
      onboarding = { email_sent: false, note: 'Existing seller account reused; no new temporary password issued.' };
      console.log(`[ADMIN] Enquiry ${id} converted (reuse): seller ${conv.seller.id}.`);
    }
    const propertyFresh = await db.Property.findByPk(conv.property.id);
    return res.json({
      ok: true,
      enquiry: { id: enquiry.id, status: enquiry.status },
      seller: { id: conv.seller.id, email: conv.seller.email },
      property: { id: propertyFresh.id, status: propertyFresh.status },
      onboarding,
    });
  } catch (err) {
    console.error('[ADMIN] Failed to update enquiry status:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update enquiry status right now. Please try again later.' });
  }
};
