import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProperty } from '../api/properties';

export default function CreateProperty() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', address: '', city: '', state: '', pincode: '', asking_price: '', latitude: '', longitude: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (form.title.trim().length < 3) return setError('Property title must be at least 3 characters.'); setBusy(true); setError(''); try { const result = await createProperty(form); navigate(`/properties/${result.property.id}`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create property.'); } finally { setBusy(false); } };
  return <div className="page"><div className="page-header"><button className="btn-secondary btn-sm" onClick={() => navigate('/properties')}>← Back</button><h2>Create property</h2><p>Only fields supported by the current property API are shown.</p></div>{error && <div className="error-message" role="alert">{error}</div>}<form className="detail-card property-form" onSubmit={submit}><div className="detail-section"><div className="detail-grid">{Object.entries(form).map(([key, value]) => <label className="form-group" key={key}>{key.replace(/_/g, ' ')}{key === 'description' ? <textarea value={value} onChange={e => setForm({ ...form, [key]: e.target.value })} maxLength={5000} /> : <input required={key === 'title'} type={['asking_price','latitude','longitude'].includes(key) ? 'number' : 'text'} value={value} onChange={e => setForm({ ...form, [key]: e.target.value })} />}</label>)}</div></div><div className="detail-section"><button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create property'}</button></div></form></div>;
}
