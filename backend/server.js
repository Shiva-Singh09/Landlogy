import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { BrevoClient } from '@getbrevo/brevo';
import bcrypt from 'bcryptjs';
import db from './models/index.js';
import { authenticate, authorize, generateToken } from './middleware/auth.js';
import { upload, UPLOAD_DIR } from './config/upload.js';
import fs from 'fs';
import path from 'path';

const app=express();
const PORT=process.env.PORT||5000;
app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)||true,methods:['POST','GET']}));
app.use(express.json({limit:'32kb'}));
app.use('/uploads', express.static(path.join(path.dirname(new URL(import.meta.url).pathname), 'uploads')));
app.use(rateLimit({windowMs:15*60*1000,max:40,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',async(_,res)=>{
  const health = { ok: true, database: 'unknown' };
  try {
    await db.sequelize.authenticate();
    health.database = 'connected';
  } catch (err) {
    health.database = 'disconnected';
    health.databaseError = err.message || 'Connection failed';
  }
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ── Authentication ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input presence (generic error to avoid revealing which field is missing)
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    // Normalize email
    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user by email
    const user = await db.User.findOne({ where: { email: normalizedEmail } });

    // Generic error message — do not reveal if user exists or password is wrong
    const authFailed = () =>
      res.status(401).json({ ok: false, error: 'Invalid email or password.' });

    if (!user) {
      // Perform dummy hash comparison to prevent timing attacks
      await bcrypt.compare(password, '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum');
      return authFailed();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return authFailed();
    }

    // Check account status — only active users can log in
    if (user.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'Account is not active. Please contact support.' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Update last login timestamp
    user.last_login_at = new Date();
    await user.save();

    console.log(`[AUTH] Login successful: ${user.email} (${user.role})`);

    // Return safe user information + token
    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        force_password_change: user.force_password_change,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to process login right now. Please try again later.' });
  }
});

// ── Admin Account Provisioning (Admin only) ──────────────────────
// Creates admin accounts only. No Broker/Seller/Buyer account creation.
app.post('/api/auth/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Name, email, and password are required.' });
    }

    // Sanitize string fields
    const cleanName = clean(name, 100);
    const cleanEmail = clean(email, 160).toLowerCase();
    const cleanPhone = phone ? clean(phone, 20) : null;

    // Validate field lengths
    if (cleanName.length < 2) {
      return res.status(400).json({ ok: false, error: 'Name must be at least 2 characters.' });
    }

    if (cleanEmail.length < 5) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    // Validate password strength
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters.' });
    }

    // Check for duplicate email before attempting create
    const existingUser = await db.User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Create admin user with safe defaults
    // Role is always 'admin' — this endpoint is for admin account provisioning only
    const user = await db.User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'admin',
      phone: cleanPhone,
      status: 'active',
      is_email_verified: false,
      is_phone_verified: false,
      force_password_change: true,
    });

    console.log(`[AUTH] User created: ${user.email} (${user.role}) by admin ${req.user.id}`);

    // Return safe user data (never include password or password_hash)
    return res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        force_password_change: user.force_password_change,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    // Handle unique constraint violation as final protection
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
    }
    console.error('[AUTH] Registration failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to create account right now. Please try again later.' });
  }
});

// ── Enquiries ───────────────────────────────────────────────────
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const isValidEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone=phone=>/^(?:\+91\s?)?[6-9]\d{9}$/.test(phone.replace(/\s+/g,''));
const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizePhone=(raw)=>{const s=String(raw??'').replace(/[\s\-()]/g,'');const m=s.match(/^\+?91(\d{10})$/);if(m) return `+91${m[1]}`;const d=s.replace(/\D/g,'');if(/^[6-9]\d{9}$/.test(d)) return `+91${d}`;if(/^91([6-9]\d{9})$/.test(d)) return `+${d}`;return String(raw??'').trim().slice(0,40)};
const formatPhoneDisplay=(e164)=>{const m=String(e164||'').match(/^\+91([6-9]\d{9})$/);if(m) return `+91 ${m[1].slice(0,5)} ${m[1].slice(5)}`;return String(e164||'')};
// TextBee SMS (SMS only; never expose TEXTBEE_API). Fire-and-forget — failures never affect email results.
const sendTextBeeSms=async(phone,message)=>{
  const key=process.env.TEXTBEE_API;
  if(!key) return {sent:false,skipped:'no-api-key'};
  try{
    const res=await fetch('https://api.textbee.dev/api/v1/gateway/send-sms',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key},body:JSON.stringify({recipients:[phone],message})});
    if(!res.ok){
      let body='';
      try{body=await res.text()}catch{}
      console.error('[SMS] TextBee send failed:',{status:res.status,body:body.slice(0,200)});
      return {sent:false};
    }
    return {sent:true};
  }catch(err){
    console.error('[SMS] TextBee request error:',err?.message||err);
    return {sent:false};
  }
};

// Brevo config check (server-only; never expose BREVO_API_KEY to frontend).
if(!process.env.BREVO_API_KEY){
  console.error('[MAIL] BREVO_API_KEY is missing. Email sending is disabled. Set BREVO_API_KEY in the server environment.');
}
if(!process.env.MAIL_TO||!process.env.MAIL_FROM){
  console.error('[MAIL] MAIL_TO and/or MAIL_FROM is missing. Email sending is disabled.');
}

app.post('/api/enquiries',async(req,res)=>{
  try{
    const b=req.body||{};
    if(clean(b.website,100)) return res.json({ok:true}); // honeypot
    const name=clean(b.name,100), phone=clean(b.phone,40), email=clean(b.email,160), city=clean(b.city,120), message=clean(b.message,2000), intent=clean(b.intent,120), propertyType=clean(b.property_type,120), formType=clean(b.formType,60);
    if(!['property-enquiry','contact-message'].includes(formType)) return res.status(400).json({ok:false,error:'Invalid submission.'});
    if(String(b.message??'').length>2000) return res.status(400).json({ok:false,error:'Message is too long (max 2000 characters)..'});

    // Validation
    if(!name||name.length<2||name.length>80||/^\d+$/.test(name)||!/[\p{L}]/u.test(name)) return res.status(400).json({ok:false,error:'A valid name is required.'});
    if(!isValidPhone(phone)) return res.status(400).json({ok:false,error:'A valid 10-digit Indian mobile number is required.'});
    if(email && !isValidEmail(email)) return res.status(400).json({ok:false,error:'A valid email address is required.'});
    if(!city) return res.status(400).json({ok:false,error:'City/Location is required.'});
    if(city.length>120) return res.status(400).json({ok:false,error:'City/Location is too long.'});
    if(!intent) return res.status(400).json({ok:false,error:'Please select your intent.'});
    if(formType==='property-enquiry'&&!propertyType) return res.status(400).json({ok:false,error:'Property type is required.'});
    if(formType==='contact-message' && (!message || message.length<10)) return res.status(400).json({ok:false,error:'Please enter a detailed message (min 10 characters).'});

    // Persist enquiry to PostgreSQL — primary record
    try {
      await db.Enquiry.create({
        name,
        phone,
        email: email || null,
        city,
        message: message || null,
        intent,
        property_type: propertyType || null,
        status: 'new',
      });
      console.log(`[DB] Enquiry saved for ${name} (${phone})`);
    } catch (dbErr) {
      console.error('[DB] Failed to save enquiry:', dbErr?.message || dbErr);
      return res.status(503).json({ok:false,error:'Unable to record your enquiry right now. Please try again later.'});
    }

    // Brevo / mail env checks — never expose env values to the client.
    if(!process.env.BREVO_API_KEY){
      console.error('[MAIL] BREVO_API_KEY is missing. Cannot send enquiry email.');
      return res.status(503).json({ok:false,error:'Email service is not configured on server.'});
    }
    if(!process.env.MAIL_TO||!process.env.MAIL_FROM){
      console.error('[MAIL] MAIL_TO and/or MAIL_FROM is missing. Cannot send enquiry email.');
      return res.status(503).json({ok:false,error:'Email service is not configured on server.'});
    }

    const isProperty=formType==='property-enquiry';
    const normPhone=normalizePhone(phone);
    const telHref=normPhone?`tel:${normPhone.replace(/\s+/g,'')}`:'';
    const dispPhone=formatPhoneDisplay(normPhone||phone);
    const hasEmail=email&&isValidEmail(email);

    const callCta=telHref?`<div style="margin:18px 0 4px;text-align:center;"><a href="${telHref}" style="display:inline-block;background:#c8922a;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 30px;border-radius:10px;">&#9742; CALL NOW: ${escapeHtml(dispPhone)}</a></div><p style="margin:10px 0 0;text-align:center;color:#64748b;font-size:12px;">Mobile: ${escapeHtml(dispPhone)} (tap CALL NOW on your phone to dial directly)</p>`:`<p style="margin:14px 0 0;color:#0f172a;font-size:14px;"><strong>Mobile:</strong> ${escapeHtml(dispPhone)}</p>`;
    const replyCta=hasEmail?`<div style="margin:14px 0 0;text-align:center;"><a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:10px;">&#9993; REPLY TO CUSTOMER: ${escapeHtml(email)}</a></div>`:'';
    // Internal company email (CRM-style notification; visitor email used only as replyTo).
    const subject=isProperty?'New Property Enquiry — LANDLOGY':'New Website Message — LANDLOGY';
    const text=[`LANDLOGY website submission`,`Type: ${formType||'website-form'}`,`Name: ${name}`,`Phone: ${phone}`,email&&`Email: ${email}`,intent&&`Intent: ${intent}`,propertyType&&`Property Type: ${propertyType}`,city&&`City / Location: ${city}`,message&&`Message: ${message}`].filter(Boolean).join('\n');
    const row=(label,value)=>value?`<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td></tr>`:'';
    const htmlContent=`<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#0f172a;padding:20px 24px;"><h1 style="margin:0;color:#ffffff;font-size:18px;">${escapeHtml(subject)}</h1><p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">LANDLOGY website submission</p></div>${callCta}${replyCta}<table style="width:100%;border-collapse:collapse;">${row('Submission type',formType)}${row('Name',name)}${row('Phone',phone)}${row('Email',email)}${row('Intent',intent)}${row('Property type',propertyType)}${row('City / Location',city)}${row('Message',message)}</table></div></div>`;
    const brevo=new BrevoClient({apiKey:process.env.BREVO_API_KEY});
    let result;
    try{
      result=await brevo.transactionalEmails.sendTransacEmail({sender:{name:'LANDLOGY',email:process.env.MAIL_FROM},to:[{email:process.env.MAIL_TO}],subject,htmlContent,textContent:text,...(hasEmail?{replyTo:{email}}:{})});
    }catch(brevoErr){
      const statusCode=brevoErr?.status||brevoErr?.statusCode||brevoErr?.response?.status;
      const apiBody=brevoErr?.responseBody||brevoErr?.response?.data||brevoErr?.body;
      console.error('[MAIL] Brevo internal send failed:',{status:statusCode,message:brevoErr?.message,body:apiBody});
      return res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
    }
    const internalId=result?.messageId||result?.messageIds?.[0]||'';
    console.log(`[MAIL] Internal ${isProperty?'enquiry':'contact'} email delivered${internalId?` (messageId: ${internalId})`:''}`);
    // B) Customer acknowledgement email — MESSAGE form only (enquiry customer ack is SMS via TextBee).
    if(hasEmail && !isProperty){
      const ackSubject=isProperty?'We received your property enquiry — LANDLOGY':'We received your message — LANDLOGY';
      const ackBodyEn=isProperty
        ?`<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">Thank you for your property enquiry with LANDLOGY.</h2><p style="margin:0 0 10px;">We have successfully received your enquiry.</p><p style="margin:0 0 10px;"><strong>Your enquiry details:</strong></p><ul style="margin:0 0 18px;padding-left:18px;"><li><strong>Property Type:</strong> ${escapeHtml(propertyType)}</li><li><strong>City / Location:</strong> ${escapeHtml(city)}</li><li><strong>Intent:</strong> ${escapeHtml(intent)}</li>${message?`<li><strong>Message:</strong> ${escapeHtml(message)}</li>`:''}</ul><p style="margin:0 0 10px;">Our team will review your requirements and contact you as soon as possible.</p><p style="margin:0 0 10px;">Thank you for choosing LANDLOGY.</p>`
        :`<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">Thank you very much for contacting LANDLOGY.</h2><p style="margin:0 0 10px;">Your message has successfully reached us.</p><p style="margin:0 0 10px;"><strong>Here is the message you submitted:</strong></p><blockquote style="margin:6px 0 18px;padding:10px 14px;background:#f1f5f9;border-left:4px solid #c8922a;color:#0f172a;font-style:italic;">“${escapeHtml(message)}”</blockquote><p style="margin:0 0 10px;">We truly appreciate you taking the time to contact us.</p><p style="margin:0 0 10px;">Our team will review your message and get back to you as soon as possible.</p><p style="margin:0 0 10px;">Thank you for reaching out to LANDLOGY.</p>`;
      const ackBodyHi=isProperty
        ?`<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">नमस्ते, धन्यवाद।</h2><p style="margin:0 0 10px;">LANDLOGY में प्रॉपर्टी संबंधी पूछताछ करने के लिए आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">हमें आपकी पूछताछ सफलतापूर्वक प्राप्त हो गई है।</p><p style="margin:0 0 10px;"><strong>आपकी पूछताछ का विवरण:</strong></p><ul style="margin:0 0 18px;padding-left:18px;"><li><strong>प्रॉपर्टी का प्रकार:</strong> ${escapeHtml(propertyType)}</li><li><strong>शहर / स्थान:</strong> ${escapeHtml(city)}</li><li><strong>आपकी आवश्यकता:</strong> ${escapeHtml(intent)}</li>${message?`<li><strong>संदेश:</strong> ${escapeHtml(message)}</li>`:''}</ul><p style="margin:0 0 10px;">हमारी टीम आपकी आवश्यकता की समीक्षा करेगी और आपसे जल्द से जल्द संपर्क करेगी।</p><p style="margin:0 0 10px;">LANDLOGY को चुनने के लिए आपका धन्यवाद।</p>`
        :`<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">नमस्ते, धन्यवाद।</h2><p style="margin:0 0 10px;">LANDLOGY से संपर्क करने के लिए आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">आपका संदेश हमें सफलतापूर्वक प्राप्त हो गया है।</p><p style="margin:0 0 10px;"><strong>आपने हमें यह संदेश भेजा है:</strong></p><blockquote style="margin:6px 0 18px;padding:10px 14px;background:#f1f5f9;border-left:4px solid #c8922a;color:#0f172a;font-style:italic;">“${escapeHtml(message)}”</blockquote><p style="margin:0 0 10px;">हमसे संपर्क करने के लिए अपना समय देने हेतु आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">हमारी टीम आपके संदेश की समीक्षा करेगी और आपसे जल्द से जल्द संपर्क करेगी।</p><p style="margin:0 0 10px;">LANDLOGY से संपर्क करने के लिए धन्यवाद।</p>`;
      const ackHtml=`<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f1f5f9;"><div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#151f2e;padding:22px 24px;"><p style="margin:0;color:#c8922a;font-size:12px;font-weight:700;letter-spacing:.14em;">LANDLOGY</p><h1 style="margin:6px 0 0;color:#ffffff;font-size:19px;">${escapeHtml(ackSubject)}</h1></div><div style="padding:22px 24px;color:#0f172a;font-size:14px;line-height:1.65;"><p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>${ackBodyEn}<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/><p style="margin:0 0 12px;">नमस्ते ${escapeHtml(name)},</p>${ackBodyHi}<p style="margin:20px 0 0;color:#64748b;font-size:13px;">Regards / सादर,<br/><strong style="color:#0f172a;">LANDLOGY Team</strong><br/>Real Estate &bull; Research &bull; Advisory</p></div></div></div></div></body></html>`;
      const ackText=[`Hi ${name},`,ackBodyEn.replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').trim(),'','हिंदी:','',ackBodyHi.replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').trim(),'','Regards / सादर,','LANDLOGY Team','Real Estate • Research • Advisory'].join('\n');
      let ackResult;
      try{
        ackResult=await brevo.transactionalEmails.sendTransacEmail({sender:{name:'LANDLOGY',email:process.env.MAIL_FROM},to:[{email}],subject:ackSubject,htmlContent:ackHtml,textContent:ackText,headers:{'X-LANDLOGY-Message-Type':isProperty?'property-enquiry-ack':'contact-message-ack'}});
      }catch(ackErr){
        const statusCode=ackErr?.status||ackErr?.statusCode||ackErr?.response?.status;
        const apiBody=ackErr?.responseBody||ackErr?.response?.data||ackErr?.body;
        console.error('[MAIL] Brevo acknowledgement send failed:',{status:statusCode,message:ackErr?.message,body:apiBody});
        return res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
      }
      const ackId=ackResult?.messageId||ackResult?.messageIds?.[0]||'';
      console.log(`[MAIL] Customer ${isProperty?'enquiry':'contact'} acknowledgement delivered${ackId?` (messageId: ${ackId})`:''}`);
    }
    // C) TextBee customer SMS acknowledgement — ENQUIRY form only (SMS failure never breaks successful Brevo emails).
    if(isProperty){
      try{
        const smsMsg=`New LANDLOGY Property Enquiry - ${name}. City: ${city}. Property: ${propertyType}. Intent: ${intent}. Our team will contact you soon.`;
        const smsResult=await sendTextBeeSms(normPhone,smsMsg);
        if(smsResult.sent) console.log('[SMS] Customer SMS acknowledgement delivered');
        else if(!smsResult.skipped) console.log('[SMS] Customer SMS acknowledgement not delivered');
      }catch(smsErr){
        console.error('[SMS] TextBee send error:',smsErr?.message||smsErr);
      }
    }
    res.json({ok:true});
  }catch(err){
    console.error('[MAIL] send failed:', err);
    res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
  }
});

// ── Property Submission (Admin only) ──────────────────────────────
app.post('/api/properties', authenticate, authorize('admin'), async (req, res) => {
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
});

// ── Admin Enquiry Management API ─────────────────────────────────

// Valid enquiry statuses from the Enquiry model ENUM
const ENQUIRY_STATUSES = ['new', 'reviewed', 'converted', 'rejected'];

// GET /api/admin/enquiries — List Seller/Client enquiries (Admin only)
app.get('/api/admin/enquiries', authenticate, authorize('admin'), async (req, res) => {
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
});

// GET /api/admin/enquiries/:id — Get single Seller/Client enquiry (Admin only)
app.get('/api/admin/enquiries/:id', authenticate, authorize('admin'), async (req, res) => {
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
});

// PATCH /api/admin/enquiries/:id/status — Update enquiry status (Admin only)
app.patch('/api/admin/enquiries/:id/status', authenticate, authorize('admin'), async (req, res) => {
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

    // Update status and audit fields
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
  } catch (err) {
    console.error('[ADMIN] Failed to update enquiry status:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update enquiry status right now. Please try again later.' });
  }
});

// ── Admin Property Management API ────────────────────────────────

// Valid property statuses from the Property model ENUM
const PROPERTY_STATUSES = ['draft', 'under_review', 'active', 'rejected', 'inactive', 'sold', 'archived'];

// GET /api/admin/properties — List properties (Admin only)
app.get('/api/admin/properties', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      property_type_id,
      city,
      state,
      search,
    } = req.query || {};

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

    const { count, rows: properties } = await db.Property.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

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
});

// GET /api/admin/properties/:id — Get property details (Admin only)
app.get('/api/admin/properties/:id', authenticate, authorize('admin'), async (req, res) => {
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
});

// PATCH /api/admin/properties/:id/status — Update property status (Admin only)
app.patch('/api/admin/properties/:id/status', authenticate, authorize('admin'), async (req, res) => {
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
});

// ── Admin Property Image Management API ──────────────────────────

// POST /api/admin/properties/:id/images — Upload property image (Admin only)
app.post('/api/admin/properties/:id/images', authenticate, authorize('admin'), upload.single('image'), async (req, res) => {
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
});

// GET /api/admin/properties/:id/images — List property images (Admin only)
app.get('/api/admin/properties/:id/images', authenticate, authorize('admin'), async (req, res) => {
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
});

// DELETE /api/admin/properties/:propertyId/images/:imageId — Delete property image (Admin only)
app.delete('/api/admin/properties/:propertyId/images/:imageId', authenticate, authorize('admin'), async (req, res) => {
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
});

app.listen(PORT, async () => {
  console.log(`LANDLOGY API running on http://localhost:${PORT}`);
  try {
    await db.sequelize.authenticate();
    console.log('[DB] PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('[DB] Unable to connect to PostgreSQL:', err.message);
    console.error('[DB] The server will continue running, but database operations will fail.');
    console.error('[DB] Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env and run migrations.');
  }
});
