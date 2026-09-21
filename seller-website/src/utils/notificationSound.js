// ── Shared seller notification-sound singleton ──────────────────────────────
// Same notification sound as the admin app: the identical two-tone WebAudio
// chime and the identical persisted preference key (landlogy_notification_sound)
// that admin/src/components/notifications/useNotificationSound.ts uses. There is
// no sound asset — the chime is synthesised, so reusing it means mirroring these
// exact parameters. One module-level AudioContext is shared by every surface
// (popup, Profile, Support) through subscribe(), so the preference is one source
// of truth and audio contexts are never duplicated.
//
// Sounds play only in the foreground while the page is running; browsers do not
// allow custom sound control for closed-browser OS notifications (the system
// notification itself carries the seller's silent preference instead).

const SOUND_KEY = 'landlogy_notification_sound';

const readStored = () => {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
};

let enabled = readStored();
const listeners = new Set();

// Short two-tone chime — identical parameters to the admin implementation.
function beep(context) {
  if (!context || context.state !== 'running') return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(960, at);
    oscillator.frequency.exponentialRampToValueAtTime(1880, at + 0.92);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(1, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0005, at + 0.3);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + 0.32);
  } catch { /* Never interrupt notification delivery for an audio failure. */ }
}

let audio = null;
const context = () => {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume().catch(() => undefined);
    return audio;
  } catch { return null; }
};

// Browsers only allow audio after a user gesture; unlock the shared context on
// the first one. Runs once for the whole app (module-level listeners).
if (typeof document !== 'undefined') {
  const unlock = () => { if (enabled) context(); };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

export function getSoundEnabled() {
  return enabled;
}

export function subscribeSound(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Plain click handler (never inside a state updater). Flips the preference,
// persists it under the same key as the admin app, notifies every surface and —
// when turning ON — confirms with the SAME chime exactly once, from this user
// gesture. No notification, no request, no retry is triggered here.
export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* Session-only preference. */ }
  for (const listener of listeners) listener(enabled);
  if (enabled) {
    const active = context();
    if (active) {
      if (active.state === 'suspended') void active.resume().then(() => beep(active)).catch(() => undefined);
      else beep(active);
    }
  }
  return enabled;
}

// Foreground alert: plays the chime only when sound is enabled. Safe to call
// for every arriving notification; a suspended context is resumed first (this
// only succeeds after a user gesture — otherwise it stays silent, as browsers
// require).
export function playSound() {
  if (!enabled) return;
  try {
    const active = context();
    if (!active) return;
    if (active.state === 'suspended') { void active.resume().then(() => beep(active)).catch(() => undefined); return; }
    beep(active);
  } catch { /* Never interrupt notification delivery for an audio failure. */ }
}
