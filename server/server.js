import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { BrevoClient } from '@getbrevo/brevo';

const app=express();
const PORT=process.env.PORT||5000;
app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)||true,methods:['POST','GET']}));
app.use(express.json({limit:'32kb'}));
app.use(rateLimit({windowMs:15*60*1000,max:40,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(_,res)=>res.json({ok:true}));
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const isValidEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone=phone=>/^(?:\+91\s?)?[6-9]\d{9}$/.test(phone.replace(/\s+/g,''));
const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

    // Brevo / mail env checks — never expose env values to the client.
    if(!process.env.BREVO_API_KEY){
      console.error('[MAIL] BREVO_API_KEY is missing. Cannot send enquiry email.');
      return res.status(503).json({ok:false,error:'Email service is not configured on server.'});
    }
    if(!process.env.MAIL_TO||!process.env.MAIL_FROM){
      console.error('[MAIL] MAIL_TO and/or MAIL_FROM is missing. Cannot send enquiry email.');
      return res.status(503).json({ok:false,error:'Email service is not configured on server.'});
    }

    const subject=formType==='property-enquiry'?`New Property Enquiry — ${intent||'LANDLOGY'}`:`New Website Message — LANDLOGY`;
    const text=[`LANDLOGY website submission`,`Type: ${formType||'website-form'}`,`Name: ${name}`,`Phone: ${phone}`,email&&`Email: ${email}`,intent&&`Intent: ${intent}`,propertyType&&`Property Type: ${propertyType}`,city&&`City / Location: ${city}`,message&&`Message: ${message}`].filter(Boolean).join('\n');
    const row=(label,value)=>value?`<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td></tr>`:'';
    const htmlContent=`<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#0f172a;padding:20px 24px;"><h1 style="margin:0;color:#ffffff;font-size:18px;">${escapeHtml(subject)}</h1><p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">LANDLOGY website submission</p></div><table style="width:100%;border-collapse:collapse;">${row('Submission type',formType)}${row('Name',name)}${row('Phone',phone)}${row('Email',email)}${row('Intent',intent)}${row('Property type',propertyType)}${row('City / Location',city)}${row('Message',message)}</table></div></div>`;
    const brevo=new BrevoClient({apiKey:process.env.BREVO_API_KEY});
    const payload={sender:{name:'LANDLOGY',email:process.env.MAIL_FROM},to:[{email:process.env.MAIL_TO}],subject,htmlContent,textContent:text,...(email&&isValidEmail(email)?{replyTo:{email}}:{})};
    let result;
    try{
      result=await brevo.transactionalEmails.sendTransacEmail(payload);
    }catch(brevoErr){
      const statusCode=brevoErr?.status||brevoErr?.statusCode||brevoErr?.response?.status;
      const apiBody=brevoErr?.responseBody||brevoErr?.response?.data||brevoErr?.body;
      console.error('[MAIL] Brevo internal send failed:',{status:statusCode,message:brevoErr?.message,body:apiBody});
      return res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
    }
    const internalId=result?.messageId||result?.messageIds?.[0]||'';
    console.log(`[MAIL] Internal enquiry delivered${internalId?` (messageId: ${internalId})`:''}`);
    // B) Customer acknowledgement — only when the visitor supplied a valid email.
    if(email&&isValidEmail(email)){
      const isProperty=formType==='property-enquiry';
      const ackSubject=isProperty?'We received your property enquiry — LANDLOGY':'We received your message — LANDLOGY';
      const ackLine1=isProperty?'Thank you for your enquiry with LANDLOGY.':'Thank you for contacting LANDLOGY.';
      const ackLine2=isProperty?'We have received your property enquiry successfully.':'We have successfully received your message.';
      const ackLine3=isProperty?'Our team will review your requirements and contact you as soon as possible.':'Our team will get back to you as soon as possible.';
      const ackText=[`Hi ${name},`,'',ackLine1,ackLine2,ackLine3,'','Regards,','LANDLOGY Team','Real Estate • Research • Advisory'].join('\n');
      const ackHtml=`<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#0f172a;padding:20px 24px;"><h1 style="margin:0;color:#ffffff;font-size:18px;">${escapeHtml(ackSubject)}</h1><p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">LANDLOGY</p></div><div style="padding:20px 24px;color:#0f172a;font-size:14px;line-height:1.6;"><p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p><p style="margin:0 0 12px;">${escapeHtml(ackLine1)}</p><p style="margin:0 0 12px;">${escapeHtml(ackLine2)}</p><p style="margin:0 0 12px;">${escapeHtml(ackLine3)}</p><p style="margin:20px 0 0;">Regards,<br/><strong>LANDLOGY Team</strong><br/><span style="color:#64748b;font-size:13px;">Real Estate &bull; Research &bull; Advisory</span></p></div></div></div>`;
      let ackResult;
      try{
        ackResult=await brevo.transactionalEmails.sendTransacEmail({sender:{name:'LANDLOGY',email:process.env.MAIL_FROM},to:[{email}],subject:ackSubject,htmlContent:ackHtml,textContent:ackText});
      }catch(ackErr){
        const statusCode=ackErr?.status||ackErr?.statusCode||ackErr?.response?.status;
        const apiBody=ackErr?.responseBody||ackErr?.response?.data||ackErr?.body;
        console.error('[MAIL] Brevo acknowledgement send failed:',{status:statusCode,message:ackErr?.message,body:apiBody});
        return res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
      }
      const ackId=ackResult?.messageId||ackResult?.messageIds?.[0]||'';
      console.log(`[MAIL] Customer acknowledgement delivered${ackId?` (messageId: ${ackId})`:''}`);
    }
    res.json({ok:true});
  }catch(err){
    console.error('[MAIL] send failed:', err);
    res.status(502).json({ok:false,error:'Unable to send your message right now. Please try again later.'});
  }
});
app.listen(PORT,()=>console.log(`LANDLOGY API running on http://localhost:${PORT}`));
