import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, ChevronRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import logo from '../../assets/Logo.png';
import heroVisual from '../../assets/Hero1.png';
import { useClientAuth } from '../../hooks/useClientAuth';
import { navigate, SpaLink } from '../../utils/bus';

export function ClientLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, login } = useClientAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/client-portal');
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
      navigate('/client-portal');
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
    <main className="lla">
      <div className="lla-art">
        <div className="lla-art-bg" style={{ backgroundImage: `url(${heroVisual})` }} />
        <SpaLink to="/" aria-label="Back to LANDLOGY">
          <img className="lla-logo" src={logo} alt="LANDLOGY" />
        </SpaLink>

        <div className="lla-msg">
          <span className="lla-kicker" style={{ color: 'var(--amber)' }}>Client portal</span>
          <h1>Your property journey, <em>with clarity.</em></h1>
          <p>A private space to follow progress, review documents and stay in touch with the team handling your property.</p>
          <div className="lla-pts">
            <span><ShieldCheck size={15} /> Track every stage of your sale</span>
            <span><ShieldCheck size={15} /> Documents organised in one place</span>
            <span><ShieldCheck size={15} /> Direct line to your point of contact</span>
          </div>
        </div>

        <small>Research · Verify · Transact · Grow</small>
      </div>

      <section className="lla-panel" aria-labelledby="lla-title">
        <SpaLink className="lla-back" to="/"><ChevronRight size={15} /> Back to LANDLOGY</SpaLink>

        <div className="lla-card">
          <div className="lla-mark">L</div>
          <span className="lla-kicker">Secure access</span>
          <h2 id="lla-title">Client login</h2>
          <p>For LANDLOGY clients and property owners.</p>

          <form onSubmit={submit} noValidate>
            <div className="lla-f">
              <label htmlFor="client-email">Email address</label>
              <input id="client-email" name="email" type="email" placeholder="you@example.com"
                autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required disabled={loading} />
            </div>

            <div className="lla-f">
              <label htmlFor="client-password">Password</label>
              <div className="lla-pw">
                <input id="client-password" name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password" autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="lla-opts">
              <label className="lla-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>
              <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20portal%20password%20help">Forgot password?</a>
            </div>

            {error && <p className="lla-err" role="alert"><AlertCircle size={15} /> {error}</p>}

            <button className="lla-btn lla-btn-a" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : <>Sign in <ArrowUpRight size={16} /></>}
            </button>
          </form>

          <p className="lla-support">
            Need help? <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20portal%20support">Contact LANDLOGY support</a>
          </p>
        </div>
      </section>
    </main>
  );
}

export default ClientLoginPage;