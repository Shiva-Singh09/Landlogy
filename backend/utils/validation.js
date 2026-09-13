// Generic reusable string validation/normalization helpers (no business rules).
export const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
export const isValidEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidPhone=phone=>/^(?:\+91\s?)?[6-9]\d{9}$/.test(phone.replace(/\s+/g,''));
export const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizePhone=(raw)=>{const s=String(raw??'').replace(/[\s\-()]/g,'');const m=s.match(/^\+?91(\d{10})$/);if(m) return `+91${m[1]}`;const d=s.replace(/\D/g,'');if(/^[6-9]\d{9}$/.test(d)) return `+91${d}`;if(/^91([6-9]\d{9})$/.test(d)) return `+${d}`;return String(raw??'').trim().slice(0,40)};
export const formatPhoneDisplay=(e164)=>{const m=String(e164||'').match(/^\+91([6-9]\d{9})$/);if(m) return `+91 ${m[1].slice(0,5)} ${m[1].slice(5)}`;return String(e164||'')};
