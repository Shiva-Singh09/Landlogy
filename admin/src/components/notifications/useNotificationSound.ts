import { useCallback, useEffect, useRef, useState } from 'react';

const key = 'landlogy_notification_sound';

// Short two-tone chime. Only reached when the context is running.
function beep(context: AudioContext | null) {
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
export function useNotificationSound() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(key) !== 'off'; } catch { return true; }
  });
  const audio = useRef<AudioContext | null>(null);
  // `enabledRef` lets the one-time gesture listeners read the live preference
  // without re-running this effect. Previously the effect depended on
  // `enabled`, so switching the sound ON tore it down and closed the
  // AudioContext immediately after the confirmation chime had been scheduled —
  // which is why enabling the sound produced no audio at all.
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => {
    const unlock = () => {
      if (!enabledRef.current) return;
      try {
        audio.current ??= new AudioContext();
        if (audio.current.state === 'suspended') void audio.current.resume().catch(() => undefined);
      } catch { /* Audio is optional; banners continue to work. */ }
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      if (audio.current) void audio.current.close().catch(() => undefined);
      audio.current = null;
    };
  }, []);
  const play = useCallback(() => {
    if (!enabled) return;
    try {
      // Create lazily so an alert can still sound if the tab was never clicked;
      // resume() only succeeds once the page has received a user gesture.
      audio.current ??= new AudioContext();
      const context = audio.current;
      if (context.state === 'suspended') { void context.resume().then(() => beep(context)).catch(() => undefined); return; }
      beep(context);
    } catch { /* Never interrupt notification delivery for an audio failure. */ }
  }, [enabled]);
  // Runs as a plain click handler (never inside a state updater, so it is
  // never double-invoked). Enabling confirms with the SAME notification chime
  // exactly once, from this user gesture: no notification, banner, server call
  // or retry is created here, and nothing plays on page load.
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    try { localStorage.setItem(key, next ? 'on' : 'off'); } catch { /* Session-only preference. */ }
    setEnabled(next);
    // This runs from the user's toggle gesture: confirm enabling with the same
    // notification chime once, without creating a notification or banner.
    if (next) {
      try {
        audio.current ??= new AudioContext();
        const context = audio.current;
        if (context.state === 'suspended') void context.resume().then(() => beep(context)).catch(() => undefined);
        else beep(context);
      } catch { /* Browser audio is optional; enabling still succeeds. */ }
    }
    return next;
  }, []);
  return { enabled, toggle, play };
}
