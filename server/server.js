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
app.listen(PORT,()=>console.log(`LANDLOGY API running on http://localhost:${PORT}`));
