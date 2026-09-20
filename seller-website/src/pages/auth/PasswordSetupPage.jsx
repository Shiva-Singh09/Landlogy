import React, { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, LogOut } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { InlineSpinner } from '../../components/loading/InlineSpinner';
import { setClientPasswordApi } from '../../api/clientApi';

const strengthOf = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
};
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function PasswordSetupPage({ displayName, displayEmail, token, doLogout, onComplete }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = strengthOf(newPw);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!currentPw || !newPw || !confirmPw) { setError('Please fill in all three password fields.'); return; }
    if (newPw.length < 8) { setError('Your new password must be at least 8 characters long.'); return; }
    if (newPw.length > 128) { setError('Your new password must be shorter than 128 characters.'); return; }
    if (newPw !== confirmPw) { setError('The new passwords do not match. Please re-enter them.'); return; }
    if (newPw === currentPw) { setError('Please choose a password different from the temporary one.'); return; }

    setSaving(true);
    try {
      await setClientPasswordApi(currentPw, newPw, token);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      onComplete();
    } catch (err) {
      if (err && err.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else if (err && (err.status === 401 || err.status === 403)) {
        setError('Your session is no longer valid. Please log in again.');
      } else {
        setError('Unable to update your password. Please check the temporary password and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const flip = (k) => setShow((p) => ({ ...p, [k]: !p[k] }));
  const type = (k) => (show[k] ? 'text' : 'password');

  return (
    <main className="lla lla-solo">
      <div className="lla-card">
        <img className="lla-logo" src={logo} alt="LANDLOGY" style={{ width: 118, marginBottom: 'var(--s4)' }} />
        <span className="lla-kicker">Secure account setup</span>
        <h2>Set your password</h2>
        <p>
          Welcome{displayName ? `, ${String(displayName).split(' ')[0]}` : ''}. Choose a private password
          to open your workspace{displayEmail ? ` for ${displayEmail}` : ''}.
        </p>

        <form onSubmit={submit} noValidate>
          <div className="lla-f">
            <label htmlFor="setup-current">Temporary password</label>
            <div className="lla-pw">
              <input id="setup-current" type={type('current')} value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)} placeholder="The password we emailed you"
                autoComplete="current-password" disabled={saving} required />
              <button type="button" onClick={() => flip('current')}
                aria-label={show.current ? 'Hide password' : 'Show password'}>
                {show.current ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="lla-f">
            <label htmlFor="setup-new">New password</label>
            <div className="lla-pw">
              <input id="setup-new" type={type('next')} value={newPw}
                onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters"
                autoComplete="new-password" disabled={saving} required />
              <button type="button" onClick={() => flip('next')}
                aria-label={show.next ? 'Hide password' : 'Show password'}>
                {show.next ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {newPw && (
            <div className={`lla-meter s${strength}`}>
              <div className="lla-meter-bar"><i /><i /><i /><i /></div>
              <small>{STRENGTH_LABEL[strength] || 'Too short'}</small>
            </div>
          )}

          <div className="lla-f">
            <label htmlFor="setup-confirm">Confirm new password</label>
            <div className="lla-pw">
              <input id="setup-confirm" type={type('confirm')} value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)} placeholder="Type it once more"
                autoComplete="new-password" disabled={saving} required />
              <button type="button" onClick={() => flip('confirm')}
                aria-label={show.confirm ? 'Hide password' : 'Show password'}>
                {show.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <p className="lla-err" role="alert"><AlertCircle size={15} /> {error}</p>}

          <button className="lla-btn lla-btn-a" type="submit" disabled={saving}>
            {saving ? <InlineSpinner label="Saving…" /> : <><Check size={16} /> Save and continue</>}
          </button>
          <button className="lla-btn lla-btn-b" type="button" onClick={doLogout} disabled={saving}>
            <LogOut size={15} /> Log out
          </button>
        </form>

        <p className="lla-support">
          Need help? <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20account%20setup">Contact LANDLOGY support</a>
        </p>
      </div>
    </main>
  );
}

export default PasswordSetupPage;