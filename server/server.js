import 'dotenv/config';
import dns from 'node:dns/promises';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';

const app=express();
const PORT=process.env.PORT||5000;
app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)||true,methods:['POST','GET']}));
app.use(express.json({limit:'32kb'}));
app.use(rateLimit({windowMs:15*60*1000,max:40,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(_,res)=>res.json({ok:true}));
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const isValidEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone=phone=>/^(?:\+91\s?)?[6-9]\d{9}$/.test(phone.replace(/\s+/g,''));
const smtpConfigured=()=>!!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.MAIL_TO);
const smtpHost=process.env.SMTP_HOST;
let transporter=null;
// SMTP setup is async: we resolve smtp.gmail.com to an IPv4 address up-front
// (instead of relying on nodemailer's own lookup, which picked IPv6 in Render).
// It is kicked off in the background so the app always starts even if DNS
// resolution temporarily fails. The enquiry route awaits smtpInitPromise before
// sending mail and returns 503 if SMTP is unavailable.
let smtpInitPromise;
async function initTransporter(){
  if(!smtpConfigured()||!smtpHost){
    console.warn('[MAIL] SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_TO). Email sending disabled.');
    return;
  }
  try{
    const addresses=await dns.resolve4(smtpHost);
    const smtpIPv4=addresses[0];
    console.info(`[MAIL] Resolved ${smtpHost} to IPv4: ${smtpIPv4}`);
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: smtpIPv4,
      port: port,
      secure: port === 465 || String(process.env.SMTP_SECURE || 'false') === 'true',
      tls: { servername: smtpHost },
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 30000
    });
    try{
      await transporter.verify();
      console.info(`[MAIL] SMTP connection verified OK — ${smtpHost}`);
    }catch(verifyErr){
      console.warn(`[MAIL] SMTP verify warning (will retry on send): ${verifyErr.message}`);
    }
  }catch(err){
    transporter=null;
    console.error(`[MAIL] SMTP initialization failed for ${smtpHost}: ${err.message}`);
  }
}
smtpInitPromise=initTransporter();

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

    // Wait for async SMTP/DNS init to finish before dispatching mail
    await smtpInitPromise;
    if(!smtpConfigured()||!transporter) return res.status(503).json({ok:false,error:'Email service is not configured on server.'});

    const subject=formType==='property-enquiry'?`New Property Enquiry — ${intent||'LANDLOGY'}`:`New Website Message — LANDLOGY`;
    const text=[`LANDLOGY website submission`,`Type: ${formType||'website-form'}`,`Name: ${name}`,`Phone: ${phone}`,email&&`Email: ${email}`,intent&&`Intent: ${intent}`,propertyType&&`Property Type: ${propertyType}`,city&&`City / Location: ${city}`,message&&`Message: ${message}`].filter(Boolean).join('\n');
    await transporter.sendMail({from:process.env.MAIL_FROM||process.env.SMTP_USER,to:process.env.MAIL_TO,replyTo:email||undefined,subject,text});
    console.log('[MAIL] enquiry delivered to '+process.env.MAIL_TO);
    res.json({ok:true});
  }catch(err){
    console.error('[MAIL] send failed:', err);
    res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
  }
});
app.listen(PORT,()=>console.log(`LANDLOGY API running on http://localhost:${PORT}`));
