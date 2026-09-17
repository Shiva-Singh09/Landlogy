import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProperty } from '../api/properties';

export default function CreateProperty() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    asking_price: '',
    latitude: '',
    longitude: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      setError('Property title must be at least 3 characters.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = await createProperty(form);
      navigate(`/properties/${result.property.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create property.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/properties')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '0.75rem', gap: 6 }}
          >
            &larr; Back to Properties
          </button>
          <h2>Create New <span>Property</span></h2>
          <p>Add a new land parcel or residential development into the Landlogy inventory.</p>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form className="detail-card property-form" onSubmit={handleSubmit}>
        {/* Section 1: Basic Specifications */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Basic Specifications
          </h3>

          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="title">Property Title *</label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Royal Meadows Agricultural Farm Plot"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="asking_price">Asking Price (₹ INR)</label>
              <input
                id="asking_price"
                type="number"
                placeholder="e.g. 8500000"
                value={form.asking_price}
                onChange={(e) => handleChange('asking_price', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Location Details */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Location & Address
          </h3>

          <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="address">Street / Landmark Address</label>
              <input
                id="address"
                type="text"
                placeholder="e.g. Near NH-48 Expressway, Sector 12"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                placeholder="e.g. Bangalore"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                id="state"
                type="text"
                placeholder="e.g. Karnataka"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pincode">Pincode / Postal Code</label>
              <input
                id="pincode"
                type="text"
                placeholder="e.g. 560001"
                value={form.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="latitude">Latitude (GPS)</label>
              <input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g. 12.9716"
                value={form.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="longitude">Longitude (GPS)</label>
              <input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g. 77.5946"
                value={form.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Description */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Property Description & Details
          </h3>

          <div className="form-group">
            <label htmlFor="description">Overview & Key Selling Highlights</label>
            <textarea
              id="description"
              placeholder="Highlight proximity to main highway, water connections, soil quality, zoning classification, and development potential..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              maxLength={5000}
            />
          </div>
        </div>

        {/* Section 4: Submission */}
        <div className="detail-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="btn btn-secondary"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                Publishing Listing...
              </span>
            ) : (
              'Save & Continue to Photos'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
