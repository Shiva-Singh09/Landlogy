import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronRight, Eye, EyeOff } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { useClientAuth } from '../../hooks/useClientAuth';

export function ClientLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, login } = useClientAuth();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.replace('/client-portal');
    }
  }, [isAuthenticated]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const id = email.trim();
    if (!id || !password) {
      setError('Please enter your registered email and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await login(id, password, remember);
      window.location.href = '/client-portal';
    } catch (err) {
      if (err && err.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else if (err && err.status === 403) {
        setError('This account does not have client access. Please contact LANDLOGY support.');
      } else if (err && err.status === 429) {
        setError('Too many attempts. Please wait a little and try again.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="client-login-page">
      <div className="client-login-art">
        <a href="/" className="portal-brand"><img src={logo} alt="LANDLOGY" /><span>Private client workspace</span></a>
        <div className="client-login-message">
          <span className="eyebrow">LANDLOGY Client Portal</span>
          <h1>Your property journey, with clarity.</h1>
          <p>A private space for LANDLOGY clients and property owners to follow progress, review documents and stay connected with our team.</p>
          <div className="login-art-rule" />
        </div>
        <small>Research · Verify · Transact · Grow</small>
      </div>

      <section className="client-login-panel" aria-labelledby="client-login-title">
        <a className="login-back" href="/"><ChevronRight size={15} /> Back to LANDLOGY</a>
        <div className="login-card">
          <div className="login-card-heading">
            <div className="portal-mark">L</div>
            <span className="eyebrow">Secure access</span>
            <h2 id="client-login-title">Client Login</h2>
            <p>For LANDLOGY clients and property owners.</p>
          </div>

          <form onSubmit={submit} className="client-form">
            <label htmlFor="client-email">User ID / Email</label>
            <input id="client-email" name="email" type="email" placeholder="Enter your registered email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />

            <label htmlFor="client-password">Password</label>
            <div className="password-field">
              <input id="client-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Remember me</span>
              </label>
              <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20portal%20support">Forgot password?</a>
            </div>

            {error && <p className="client-error" role="alert">{error}</p>}

            <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : (
                <span>Sign in to portal <ArrowUpRight size={16} /></span>
              )}
            </button>
          </form>

          <p className="login-support">Need help accessing your account? <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20portal%20support">Contact LANDLOGY support</a></p>
        </div>
      </section>
    </main>
  );
}

export default ClientLoginPage;
