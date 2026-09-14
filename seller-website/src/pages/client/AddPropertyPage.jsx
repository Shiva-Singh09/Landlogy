import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createClientProperty } from '../../api/clientApi';
import { formatPriceINR } from '../../config/constants';
import { PropertyImageUpload } from '../../components/client/PropertyImageUpload';

const PROPERTY_TYPES = ['Villa', 'Apartment', 'Plot', 'House', 'Commercial', 'Farmhouse', 'Other'];
const PROPERTY_CATEGORIES = ['Residential', 'Commercial', 'Agricultural', 'Industrial'];

const initialForm = {
  title: '',
  description: '',
  property_type: '',
  property_category: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  latitude: '',
  longitude: '',
  asking_price: ''
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Property title is required';
  if (!form.property_type) errors.property_type = 'Select a property type';
  if (!form.property_category) errors.property_category = 'Select a property category';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.city.trim()) errors.city = 'City is required';
  if (!form.state.trim()) errors.state = 'State is required';
  if (!form.pincode.trim()) errors.pincode = 'Pincode is required';
  if (!form.asking_price || Number(form.asking_price) <= 0) errors.asking_price = 'Enter a valid asking price';
  if (form.latitude && (Number(form.latitude) < -90 || Number(form.latitude) > 90)) errors.latitude = 'Latitude must be between -90 and 90';
  if (form.longitude && (Number(form.longitude) < -180 || Number(form.longitude) > 180)) errors.longitude = 'Longitude must be between -180 and 180';
  return errors;
}

export function AddPropertyPage({ token, onBack, onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState(false);
  const [createdProperty, setCreatedProperty] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageUploadError, setImageUploadError] = useState('');

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: form.property_type,
      property_category: form.property_category,
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      asking_price: Number(form.asking_price),
      ...(form.latitude ? { latitude: Number(form.latitude) } : {}),
      ...(form.longitude ? { longitude: Number(form.longitude) } : {})
    };

    try {
      const response = await createClientProperty(payload, token);
      const property = response?.property || response?.data || response;
      setCreatedProperty(property);
      setSuccess(true);
    } catch (err) {
      if (err?.code === 'NETWORK') {
        setSubmitError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else {
        setSubmitError(err?.message || 'Failed to create property. Please try again.');
      }
        } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
        <div className="portal-welcome">
          <div>
            <span className="eyebrow">Property submitted</span>
            <h1>Successfully added</h1>
            <p>Your property has been submitted to LANDLOGY for review.</p>
          </div>
        </div>

        <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
          <div className="portal-mini-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf3', color: '#037a3c', marginBottom: '18px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#192536', fontSize: '22px' }}>
              {createdProperty?.title || form.title}
            </h3>
            <p style={{ margin: '0 0 6px', color: '#5e6c7b' }}>
              Status: <strong style={{ color: '#192536' }}>{createdProperty?.status || 'under_review'}</strong>
            </p>
            {createdProperty?.reference && (
              <p style={{ margin: '0 0 18px', color: '#5e6c7b', fontSize: '13px' }}>
                Reference: {createdProperty.reference}
              </p>
            )}
            {createdProperty?.asking_price && (
              <p style={{ margin: '0 0 18px', color: '#5e6c7b' }}>
                Asking price: {formatPriceINR(createdProperty.asking_price)}
              </p>
            )}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => { setSuccess(false); setForm(initialForm); setCreatedProperty(null); setUploadedImages([]); setImageUploadError(''); }}>
                Add Another Property
              </button>
            </div>
          </div>

          {/* Step 2: Add property images */}
          <div className="portal-mini-card" style={{ padding: '28px' }}>
            <div className="section-heading" style={{ marginBottom: '16px' }}>
              <span className="eyebrow">Step 2</span>
              <h2 style={{ margin: 0, color: '#192536' }}>Add property images</h2>
              <p style={{ margin: 0, color: '#5e6c7b', fontSize: '14px', marginTop: '6px' }}>
                Your property has been created (ID: {createdProperty?.id}). Add images so buyers can see it.
              </p>
            </div>

            {imageUploadError && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fff1f2', color: '#7f1d1d', fontSize: '13px', marginBottom: '16px' }}>
                {imageUploadError}
              </div>
            )}

            <PropertyImageUpload
              propertyId={createdProperty?.id}
              token={token}
              onImagesUploaded={(images) => {
                setUploadedImages((prev) => [...prev, ...images]);
                setImageUploadError('');
              }}
              onError={(err) => {
                setImageUploadError(err?.message || 'An error occurred during image upload.');
              }}
            />

            {uploadedImages.length > 0 && (
              <div style={{ marginTop: '18px', padding: '14px 18px', borderRadius: '10px', background: '#ecfdf3', color: '#037a3c', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span><strong>{uploadedImages.length} image{uploadedImages.length === 1 ? '' : 's'} uploaded</strong> successfully{uploadedImages.some((img) => img?.is_primary) && ' — cover image set'}.</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: uploadedImages.length > 0 || imageUploadError ? '18px' : '0', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setSuccess(false); setForm(initialForm); setCreatedProperty(null); setUploadedImages([]); setImageUploadError(''); }}>
                <ArrowLeft size={14} /> Add Another Property
              </button>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline" onClick={onSuccess}>
                  Continue without images
                </button>
                <button type="button" className="btn btn-primary" onClick={onSuccess}>
                  View My Properties
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Add new property</span>
          <h1>List a property</h1>
          <p>Submit your property details to LANDLOGY for review and listing.</p>
        </div>
      </div>

      <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
        <form className="portal-mini-card" onSubmit={handleSubmit} style={{ padding: '32px', display: 'grid', gap: '18px' }} noValidate>
          {submitError && (
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: '#fff1f2', color: '#7f1d1d', fontSize: '14px', fontWeight: 500 }}>
              {submitError}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="property-title">Property title <span style={{ color: '#b42318' }}>*</span></label>
            <input
              id="property-title"
              type="text"
              placeholder="e.g. 3 BHK Villa in Whitefield"
              value={form.title}
              onChange={handleChange('title')}
              className={errors.title ? 'has-error' : ''}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="property-description">Description</label>
            <textarea
              id="property-description"
              placeholder="Describe your property — features, amenities, highlights..."
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="property-type">Property type <span style={{ color: '#b42318' }}>*</span></label>
              <select
                id="property-type"
                value={form.property_type}
                onChange={handleChange('property_type')}
                className={errors.property_type ? 'has-error' : ''}
              >
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {errors.property_type && <span className="field-error">{errors.property_type}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="property-category">Category <span style={{ color: '#b42318' }}>*</span></label>
              <select
                id="property-category"
                value={form.property_category}
                onChange={handleChange('property_category')}
                className={errors.property_category ? 'has-error' : ''}
              >
                <option value="">Select category</option>
                {PROPERTY_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {errors.property_category && <span className="field-error">{errors.property_category}</span>}
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="property-address">Address <span style={{ color: '#b42318' }}>*</span></label>
            <input
              id="property-address"
              type="text"
              placeholder="Street address, landmark"
              value={form.address}
              onChange={handleChange('address')}
              className={errors.address ? 'has-error' : ''}
            />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="property-city">City <span style={{ color: '#b42318' }}>*</span></label>
              <input
                id="property-city"
                type="text"
                placeholder="City"
                value={form.city}
                onChange={handleChange('city')}
                className={errors.city ? 'has-error' : ''}
              />
              {errors.city && <span className="field-error">{errors.city}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="property-state">State <span style={{ color: '#b42318' }}>*</span></label>
              <input
                id="property-state"
                type="text"
                placeholder="State"
                value={form.state}
                onChange={handleChange('state')}
                className={errors.state ? 'has-error' : ''}
              />
              {errors.state && <span className="field-error">{errors.state}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="property-pincode">Pincode <span style={{ color: '#b42318' }}>*</span></label>
              <input
                id="property-pincode"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 560066"
                value={form.pincode}
                onChange={handleChange('pincode')}
                className={errors.pincode ? 'has-error' : ''}
              />
              {errors.pincode && <span className="field-error">{errors.pincode}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="property-price">Asking price (₹) <span style={{ color: '#b42318' }}>*</span></label>
              <input
                id="property-price"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 8500000"
                value={form.asking_price}
                onChange={handleChange('asking_price')}
                className={errors.asking_price ? 'has-error' : ''}
              />
              {errors.asking_price && <span className="field-error">{errors.asking_price}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="property-latitude">Latitude <span style={{ color: '#718096', fontSize: '11px' }}>(optional)</span></label>
              <input
                id="property-latitude"
                type="number"
                step="any"
                placeholder="e.g. 12.9716"
                value={form.latitude}
                onChange={handleChange('latitude')}
                className={errors.latitude ? 'has-error' : ''}
              />
              {errors.latitude && <span className="field-error">{errors.latitude}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="property-longitude">Longitude <span style={{ color: '#718096', fontSize: '11px' }}>(optional)</span></label>
              <input
                id="property-longitude"
                type="number"
                step="any"
                placeholder="e.g. 77.5946"
                value={form.longitude}
                onChange={handleChange('longitude')}
                className={errors.longitude ? 'has-error' : ''}
              />
              {errors.longitude && <span className="field-error">{errors.longitude}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={submitting}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><Loader2 size={14} className="spin" /> Submitting...</> : 'Submit Property'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
