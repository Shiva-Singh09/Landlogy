import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword) { setError('Current password is required.'); return; }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword.length > 128) { setError('New password is too long (max 128 characters).'); return; }
    if (newPassword === currentPassword) { setError('New password must be different from the current password.'); return; }
    if (newPassword !== confirmPassword) { setError('New password and confirmation do not match.'); return; }
    setBusy(true);
    try {
      await api.post<{ ok: boolean; message: string }>('/api/auth/set-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Account profile and security for the signed-in administrator.</p>
      </div>

      {user && user.force_password_change && (
        <div className="partial-success-message" role="status">
          <span>Your account is flagged for a mandatory password change. Please update your password below.</span>
        </div>
      )}

      <div className="settings-grid">
        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Profile</h2>
            <span className="dash-panel-note">Signed in</span>
          </header>
          <div className="settings-profile">
            <span className="ribbon-avatar" aria-hidden="true">
              {(user?.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || 'A'}
            </span>
            <div className="settings-profile-rows">
              <div className="settings-row"><span className="settings-label">Name</span><span className="settings-value">{user?.name}</span></div>
              <div className="settings-row"><span className="settings-label">Email</span><span className="settings-value">{user?.email}</span></div>
              <div className="settings-row"><span className="settings-label">Role</span><span className="settings-value">{user?.role}</span></div>
            </div>
          </div>
          <p className="settings-note">Profile fields are managed by the platform and cannot be edited here.</p>
        </section>

        <section className="dash-panel">
          <header className="dash-panel-head">
            <h2>Change Password</h2>
            <span className="dash-panel-note">Security</span>
          </header>
          <form className="settings-form" onSubmit={submit}>
            {error && <div className="error-message" role="alert">{error}</div>}
            {success && <div className="success-message" role="status">{success}</div>}
            <label className="form-group">
              Current password
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <label className="form-group">
              New password
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
            </label>
            <label className="form-group">
              Confirm new password
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
            </label>
            <p className="settings-note">Minimum 8 characters. Passwords are never displayed.</p>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}