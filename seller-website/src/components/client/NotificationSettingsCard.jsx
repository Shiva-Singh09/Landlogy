import { InlineSpinner } from '../../components/loading/InlineSpinner';
import { Bell, BellOff } from 'lucide-react';
const SoundOn = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>;
const SoundOff = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6"/><path d="M17 9l6 6"/></svg>;

// Status pill semantics from the EXISTING token palette (tokens.css ll-* vars):
// ok = green (success), warn = amber, err = red, info = blue, '' = neutral gray.
const PILL_TONE = { ok: 'is-ok', warn: 'is-warn', err: 'is-err', info: 'is-info', neutral: '' };

// Shared notification settings surface (Profile + Support). Renders inside the
// existing .lp-card with the existing portal primitives (lp-k, lp-quiet,
// lp-notif-pill, lp-btn) — no new visual language. Every state shown is the
// real this-browser push subscription / sound preference.
export function NotificationSettingsCard({
  pushStatus, subscribed, soundEnabled, onSubscribe, onUnsubscribe,
  onToggleSound, disabled, busy = false,
}) {
  // ── Push on this browser (this device's SUBSCRIPTION only) ──────────────
  // The single push setting. Browser Notification PERMISSION handling is NOT
  // removed — it stays inside useClientPushSubscription (requested on Enable
  // click, surfacing here as 'denied' → Blocked, 'unsupported', 'error').
  const pushStatusState = pushStatus === 'loading'
    ? { text: 'Checking…', tone: 'neutral' }
    : pushStatus === 'unsupported'
    ? { text: 'Unsupported', tone: 'neutral' }
    : pushStatus === 'denied'
    ? { text: 'Blocked', tone: 'err' }
    : pushStatus === 'error'
    ? { text: 'Unavailable', tone: 'neutral' }
    : subscribed ? { text: 'On', tone: 'ok' } : { text: 'Off', tone: 'neutral' };
  const pushDisabled = disabled || busy
    || pushStatus === 'loading' || pushStatus === 'error'
    || pushStatus === 'unsupported' || pushStatus === 'denied';

  // ── Notification sound ──────────────────────────────────────────────────
  const soundState = soundEnabled ? { text: 'Sound on', tone: 'info' } : { text: 'Sound off', tone: 'neutral' };

  return (
    <section className="lp-card">
      <div className="lp-card-head">
        <div>
          <span className="lp-k">Notifications</span>
          <h2>Notification settings</h2>
        </div>
      </div>

      <div className="lp-notif-setting">
        <div className="lp-notif-setting-info">
          <span className="lp-k">Push on this browser</span>
          <p className="lp-quiet">
            LANDLOGY can send you a browser notification when there is activity on your account, even when this site is closed.
          </p>
        </div>
        <div className="lp-notif-setting-action">
          <span className={`lp-notif-pill ${PILL_TONE[pushStatusState.tone]}`.trim()}>{pushStatusState.text}</span>
          <button type="button" className="lp-btn lp-btn-a" disabled={pushDisabled}
            onClick={() => subscribed ? onUnsubscribe() : onSubscribe()}>
            {pushStatus === 'loading' || busy
              ? <InlineSpinner label={busy ? (subscribed ? 'Disabling…' : 'Enabling…') : 'Updating…'} />
              : subscribed ? <><BellOff size={15} /> Disable</>
              : <><Bell size={15} /> Enable</>}
          </button>
        </div>
      </div>

      <div className="lp-notif-setting">
        <div className="lp-notif-setting-info">
          <span className="lp-k">Notification sound</span>
          <p className="lp-quiet">
            Plays a short sound when a new notification arrives while LANDLOGY is open.
          </p>
        </div>
        <div className="lp-notif-setting-action">
          <span className={`lp-notif-pill ${PILL_TONE[soundState.tone]}`.trim()}>{soundState.text}</span>
          <button type="button" className="lp-btn lp-btn-b" onClick={onToggleSound}
            disabled={disabled || soundEnabled === undefined}
            aria-pressed={!!soundEnabled}
            aria-label={soundEnabled ? 'Notification sound is on. Turn it off.' : 'Notification sound is off. Turn it on.'}>
            {soundEnabled ? <><SoundOn size={15} /> Sound on</> : <><SoundOff size={15} /> Sound off</>}
          </button>
        </div>
      </div>
    </section>
  );
}
