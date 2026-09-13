import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { setClientPasswordApi } from '../../api/clientApi';

export function PasswordSetupPage({ displayName, displayEmail, token, doLogout, onComplete }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!currentPw || !newPw || !confirmPw) {
      setError('Please fill in all three password fields.');
      return;
    }
    if (newPw.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (newPw.length > 128) {
      setError('Your new password must be shorter than 128 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('The new passwords do not match. Please re-enter them.');
      return;
    }
    if (newPw === currentPw) {
      setError('Please choose a new password that is different from the temporary password.');
      return;
    }

    setSaving(true);
    try {
      await setClientPasswordApi(currentPw, newPw, token);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      onComplete();
    } catch (err) {
      if (err && err.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else if (err && (err.status === 401 || err.status === 403)) {
        setError('Your session is no longer valid. Please log in again with your latest details.');
      } else {
        setError('Unable to update your password. Please check the temporary password and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const flip = (key) => setShow((previous) => ({ ...previous, [key]: !previous[key] }));
  const inputType = (key) => (show[key] ? 'text' : 'password');

  return (
    <main className="portal-setup-page">
      <div className="portal-setup-card">
        <div className="portal-mark">L</div>
        <span className="eyebrow">Secure account setup</span>
        <h1>Complete Your Account Setup</h1>
        <p className="setup-lead">Welcome{displayName ? `, ${String(displayName).split(' ')[0]}` : ''}. Set a private password to unlock your LANDLOGY workspace{displayEmail ? ` for ${displayEmail}` : ''}.</p>

        <form onSubmit={submit} className="client-form setup-form">
          <label htmlFor="setup-current">Current / Temporary Password</label>
          <div className="password-field">
            <input id="setup-current" type={inputType('current')} value={currentPw} onChange={(event) => setCurrentPw(event.target.value)} placeholder="Enter the password shared by email" autoComplete="current-password" disabled={saving} required />
            <button type="button" onClick={() => flip('current')} aria-label={show.current ? 'Hide password' : 'Show password'}>
              {show.current ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <label htmlFor="setup-new">New Password</label>
          <div className="password-field">
            <input id="setup-new" type={inputType('next')} value={newPw} onChange={(event) => setNewPw(event.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" disabled={saving} required />
            <button type="button" onClick={() => flip('next')} aria-label={show.next ? 'Hide password' : 'Show password'}>
              {show.next ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <label htmlFor="setup-confirm">Confirm New Password</label>
          <div className="password-field">
            <input id="setup-confirm" type={inputType('confirm')} value={confirmPw} onChange={(event) => setConfirmPw(event.target.value)} placeholder="Re-enter your new password" autoComplete="new-password" disabled={saving} required />
            <button type="button" onClick={() => flip('confirm')} aria-label={show.confirm ? 'Hide password' : 'Show password'}>
              {show.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && <p className="client-error" role="alert">{error}</p>}

          <button className="btn btn-primary login-submit" type="submit" disabled={saving}>
            {saving ? 'Updating password…' : 'Update Password'}
          </button>
          <button className="btn btn-outline setup-logout" type="button" onClick={doLogout} disabled={saving}>Logout</button>
        </form>

        <p className="login-support">Need help? <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20account%20setup">Contact LANDLOGY support</a></p>
      </div>
    </main>
  );
}

export default PasswordSetupPage;
