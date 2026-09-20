import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import logo from '../../assets/Logo.png';
import heroVisual from '../../assets/Hero1.png';
import {
  forgotPasswordApi,
  verifyOtpApi,
  resetPasswordApi,
} from '../../api/clientApi';
import { navigate, SpaLink } from '../../utils/bus';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds

const strengthOf = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
};
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function ForgotPasswordPage() {
  // Step state: 1 = Request code, 2 = Verify OTP, 3 = Set new password, 4 = Success
  const [step, setStep] = useState(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [resetToken, setResetToken] = useState(null); // In-memory only

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  // Timers
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP input refs
  const otpInputRefs = useRef([]);

  // Auto-decrement timers
  useEffect(() => {
    let timer;
    if (step === 2 && expiryTimeLeft > 0) {
      timer = setInterval(() => {
        setExpiryTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expiryTimeLeft]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Step 1: Submit email to request OTP ──
  const handleRequestOtp = async (event) => {
    if (event) event.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(cleanEmail);
      setStep(2);
      setExpiryTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setAttemptsRemaining(null);
      // Focus first OTP box on transition
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      if (err?.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection.');
      } else if (err?.status === 429) {
        setError(err.message || 'Too many requests. Please wait a moment before trying again.');
      } else {
        setError(err?.message || 'Unable to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Handle OTP input changes ──
  const handleOtpChange = (index, value) => {
    // Take only the last entered char if multiple typed
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError('');

    // Advance to next input if digit entered
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back and clear previous
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const chars = pastedData.slice(0, OTP_LENGTH).split('');
    const newDigits = [...otpDigits];
    for (let i = 0; i < OTP_LENGTH; i++) {
      newDigits[i] = chars[i] || '';
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(chars.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async (event) => {
    if (event) event.preventDefault();
    setError('');

    const otpCode = otpDigits.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (expiryTimeLeft === 0) {
      setError('This verification code has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtpApi(email, otpCode);
      if (response?.reset_token) {
        setResetToken(response.reset_token);
        setStep(3);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err) {
      if (err?.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection.');
      } else if (err?.status === 400) {
        setError(err.message || 'Invalid or expired verification code.');
        if (typeof err.attempts_remaining === 'number') {
          setAttemptsRemaining(err.attempts_remaining);
        }
      } else {
        setError(err?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setExpiryTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setAttemptsRemaining(null);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Password policy checks & reset submission ──
  const passwordLengthOk = newPassword.length >= 8 && newPassword.length <= 128;
  const passwordHasLetter = /[A-Za-z]/.test(newPassword);
  const passwordHasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = passwordLengthOk && passwordHasLetter && passwordHasNumber && passwordsMatch;
  const strength = strengthOf(newPassword);

  const handleResetPassword = async (event) => {
    if (event) event.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    if (!resetToken) {
      setError('Reset session expired. Please start over.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(resetToken, newPassword, confirmPassword);
      setStep(4);
      // Automatically redirect to login after 3.5 seconds
      setTimeout(() => {
        navigate('/client-login');
      }, 3500);
    } catch (err) {
      if (err?.code === 'NETWORK') {
        setError('Unable to reach LANDLOGY services. Please check your connection.');
      } else if (err?.status === 401) {
        setError('Your reset session has expired. Please request a new verification code.');
      } else {
        setError(err?.message || 'Unable to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lla">
      {/* Left visual column */}
      <div className="lla-art">
        <div className="lla-art-bg" style={{ backgroundImage: `url(${heroVisual})` }} />
        <SpaLink to="/" aria-label="Back to LANDLOGY">
          <img className="lla-logo" src={logo} alt="LANDLOGY" />
        </SpaLink>

        <div className="lla-msg">
          <span className="lla-kicker" style={{ color: 'var(--amber)' }}>
            Account Security
          </span>
          <h1>
            Secure password <em>recovery.</em>
          </h1>
          <p>
            Verify your account with a one-time code to regain access to your LANDLOGY client workspace and portfolio documents.
          </p>
          <div className="lla-pts">
            <span>
              <ShieldCheck size={15} /> Instant 6-digit email verification
            </span>
            <span>
              <ShieldCheck size={15} /> End-to-end encrypted password reset
            </span>
            <span>
              <ShieldCheck size={15} /> 24/7 client support assistance
            </span>
          </div>
        </div>

        <small>Research · Verify · Transact · Grow</small>
      </div>

      {/* Right form panel */}
      <section className="lla-panel" aria-labelledby="lla-fp-title">
        <SpaLink className="lla-back" to="/client-login">
          <ChevronRight size={15} /> Back to login
        </SpaLink>

        <div className="lla-card">
          <div className="lla-mark">
            {step === 4 ? <CheckCircle2 size={24} style={{ color: 'var(--emerald)' }} /> : <KeyRound size={22} />}
          </div>

          {/* ══════════════════════════════════════════════════════
              STEP 1: Request Code
              ══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <span className="lla-kicker">Step 1 of 3 &bull; Account lookup</span>
              <h2 id="lla-fp-title">Forgot password?</h2>
              <p>
                Enter your registered email address and we'll send a 6-digit verification code to reset your password.
              </p>

              <form onSubmit={handleRequestOtp} noValidate>
                <div className="lla-f">
                  <label htmlFor="fp-email">Email address</label>
                  <input
                    id="fp-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="lla-err" role="alert" aria-live="polite">
                    <AlertCircle size={15} /> {error}
                  </p>
                )}

                <button className="lla-btn lla-btn-a" type="submit" disabled={loading}>
                  {loading ? 'Sending code…' : <>Send verification code <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 2: Enter 6-Digit OTP
              ══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <span className="lla-kicker">Step 2 of 3 &bull; Verification</span>
              <h2 id="lla-fp-title">Enter code</h2>
              <p>
                If <strong>{email}</strong> is registered, we sent a 6-digit code. Enter it below to continue.
              </p>

              <form onSubmit={handleVerifyOtp} noValidate>
                {/* 6 Digit Input Grid */}
                <div
                  className="lla-otp-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px',
                    margin: '0 0 var(--s4)',
                  }}
                  onPaste={handleOtpPaste}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      disabled={loading}
                      aria-label={`Digit ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '22px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        borderRadius: 'var(--r-sm)',
                        border: digit ? '2px solid var(--amber)' : '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--tx-900)',
                        outline: 'none',
                        transition: 'border-color .2s, box-shadow .2s',
                      }}
                    />
                  ))}
                </div>

                {/* Expiry & Resend Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--s4)',
                    fontSize: 'var(--t-small)',
                    color: 'var(--tx-500)',
                  }}
                >
                  <span>
                    Expires in:{' '}
                    <strong style={{ color: expiryTimeLeft < 60 ? 'var(--coral)' : 'var(--tx-700)' }}>
                      {formatTime(expiryTimeLeft)}
                    </strong>
                  </span>

                  {resendCooldown > 0 ? (
                    <span style={{ color: 'var(--tx-300)' }}>
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                        fontSize: 'var(--t-small)',
                      }}
                    >
                      <RotateCw size={13} /> Resend code
                    </button>
                  )}
                </div>

                {error && (
                  <p className="lla-err" role="alert" aria-live="polite">
                    <AlertCircle size={15} /> {error}
                  </p>
                )}

                <button
                  className="lla-btn lla-btn-a"
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== OTP_LENGTH}
                >
                  {loading ? 'Verifying code…' : <>Verify code <ArrowRight size={16} /></>}
                </button>

                <button
                  className="lla-btn lla-btn-b"
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  disabled={loading}
                  style={{ marginTop: '10px' }}
                >
                  <ArrowLeft size={15} /> Change email address
                </button>
              </form>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 3: Set New Password
              ══════════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              <span className="lla-kicker">Step 3 of 3 &bull; Set new password</span>
              <h2 id="lla-fp-title">Create new password</h2>
              <p>Choose a private password for your LANDLOGY client account.</p>

              <form onSubmit={handleResetPassword} noValidate>
                {/* New Password */}
                <div className="lla-f">
                  <label htmlFor="fp-new-password">New password</label>
                  <div className="lla-pw">
                    <input
                      id="fp-new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className={`lla-meter s${strength}`}>
                    <div className="lla-meter-bar">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <small>{STRENGTH_LABEL[strength] || 'Too short'}</small>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="lla-f">
                  <label htmlFor="fp-confirm-password">Confirm new password</label>
                  <div className="lla-pw">
                    <input
                      id="fp-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Type it once more"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Live Password Rules Checklist */}
                <div
                  style={{
                    background: 'var(--stone)',
                    borderRadius: 'var(--r-sm)',
                    padding: '12px 14px',
                    margin: '0 0 var(--s4)',
                    fontSize: 'var(--t-small)',
                    display: 'grid',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: 'var(--t-micro)', fontWeight: '700', color: 'var(--tx-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Password requirements:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: passwordLengthOk ? 'var(--emerald)' : 'var(--tx-500)' }}>
                    <Check size={14} style={{ opacity: passwordLengthOk ? 1 : 0.3 }} />
                    <span>At least 8 characters</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: passwordHasLetter ? 'var(--emerald)' : 'var(--tx-500)' }}>
                    <Check size={14} style={{ opacity: passwordHasLetter ? 1 : 0.3 }} />
                    <span>Contains at least one letter</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: passwordHasNumber ? 'var(--emerald)' : 'var(--tx-500)' }}>
                    <Check size={14} style={{ opacity: passwordHasNumber ? 1 : 0.3 }} />
                    <span>Contains at least one number</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: passwordsMatch ? 'var(--emerald)' : 'var(--tx-500)' }}>
                    <Check size={14} style={{ opacity: passwordsMatch ? 1 : 0.3 }} />
                    <span>Passwords match</span>
                  </div>
                </div>

                {error && (
                  <p className="lla-err" role="alert" aria-live="polite">
                    <AlertCircle size={15} /> {error}
                  </p>
                )}

                <button
                  className="lla-btn lla-btn-a"
                  type="submit"
                  disabled={loading || !isPasswordValid}
                >
                  {loading ? 'Resetting password…' : <>Reset password and sign in <ArrowUpRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              STEP 4: Success Confirmation
              ══════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <span className="lla-kicker" style={{ color: 'var(--emerald)' }}>
                Success
              </span>
              <h2 id="lla-fp-title" style={{ color: 'var(--tx-900)', marginBottom: '12px' }}>
                Password updated!
              </h2>
              <p style={{ marginBottom: 'var(--s5)' }}>
                Your password has been successfully reset. You can now log in to your LANDLOGY client account.
              </p>

              <div
                style={{
                  background: 'var(--emerald-lt)',
                  border: '1px solid var(--emerald)',
                  borderRadius: 'var(--r-md)',
                  padding: '16px',
                  marginBottom: 'var(--s4)',
                  color: '#067A60',
                  fontSize: 'var(--t-small)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Check size={16} /> Redirecting to login page in a few seconds…
              </div>

              <SpaLink className="lla-btn lla-btn-a" to="/client-login">
                Go to login now <ArrowRight size={16} />
              </SpaLink>
            </div>
          )}

          <p className="lla-support">
            Need help? <a href="mailto:nextgendevcoders@gmail.com?subject=Password%20reset%20support">Contact LANDLOGY support</a>
          </p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
