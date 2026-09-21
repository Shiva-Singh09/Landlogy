import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CLIENT_STORE, CLIENT_TOKEN_KEY,
  fetchClientPushConfig, fetchClientPushStatus,
  saveClientPushSubscription, removeClientPushSubscription,
  pushSubscriptionDetails
} from '../api/clientApi';
import { getSoundEnabled, subscribeSound, toggleSound as toggleSharedSound } from '../utils/notificationSound';

// ── Seller browser-push subscription hook ────────────────────────────────────
// One source of truth for the shared notification settings surface rendered in
// the popup, ProfilePage and SupportPage. The recipient is ALWAYS the
// authenticated seller token from the existing client-auth store — user ids are
// never accepted from the browser. Permission is requested only inside
// onSubscribe (a user click), never on page load.
//
// "Push on this browser" is answered from THIS browser's own pushManager
// subscription (falling back to the server flag only when the browser exposes
// none), so a subscription on another device never fakes this one's state.
// Sound preference mirrors the admin contract (localStorage
// 'landlogy_notification_sound' via the shared singleton; silent =
// !soundEnabled is stored per subscription row and honored at send time —
// toggling re-syncs the stored flag for THIS browser's subscription through the
// existing subscribe endpoint, never re-prompting or creating new rows).

// The VAPID public key is base64url; applicationServerKey needs raw bytes.
const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

// Reuse the app-level registration from main.jsx when present; register only
// if it does not exist yet. Same script URL/scope, so the browser keeps one worker.
const getRegistration = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  return (await navigator.serviceWorker.getRegistration('/'))
    ?? (await navigator.serviceWorker.register('/sw-push.js'));
};

export function useClientPushSubscription() {
  // loading | unsupported | denied | error | ready
  const [pushStatus, setPushStatus] = useState('loading');
  const [subscribed, setSubscribed] = useState(false);
  // Sound lives in the shared singleton (same key as the admin app), so the
  // popup, Profile and Support always show — and toggle — the same preference.
  const soundEnabled = useSyncExternalStore(subscribeSound, getSoundEnabled);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(async () => {
    setPushStatus('loading');
    try {
      if (typeof Notification === 'undefined'
        || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported');
        return;
      }
      const status = await fetchClientPushStatus(CLIENT_STORE.get(CLIENT_TOKEN_KEY));
      if (!alive.current) return;
      if (!status.enabled) { setSubscribed(false); setPushStatus('unsupported'); return; }

      // This browser's own subscription decides "Push on this browser" — a
      // subscription saved on another device never fakes this one. The server
      // flag is only the fallback when no pushManager subscription is readable.
      let localSubscribed = null;
      try {
        const registration = await getRegistration();
        localSubscribed = registration ? !!(await registration.pushManager.getSubscription()) : null;
      } catch { localSubscribed = null; }

      if (!alive.current) return;
      setSubscribed(typeof localSubscribed === 'boolean' ? localSubscribed : !!status.subscribed);
      setPushStatus(Notification.permission === 'denied' ? 'denied' : 'ready');
    } catch {
      if (alive.current) setPushStatus('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Re-check when the seller returns to the tab — permission and subscriptions
  // may have changed in browser settings while the page was hidden. Read-only
  // status refresh: no permission prompt, no list fetch.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const toggleSound = useCallback(() => {
    const next = toggleSharedSound();
    // Mirror the stored per-subscription silent flag for THIS browser through
    // the existing subscribe endpoint (same endpoint/keys, new silent) — no
    // permission prompt, no new subscription row, no new API. Best effort: the
    // preference is already persisted locally either way.
    void (async () => {
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted'
          || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const registration = await getRegistration();
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        if (!subscription) return;
        const { endpoint, keys } = await pushSubscriptionDetails(subscription);
        if (!endpoint || !keys?.p256dh || !keys?.auth) return;
        await saveClientPushSubscription(
          { endpoint, keys, silent: !next },
          CLIENT_STORE.get(CLIENT_TOKEN_KEY)
        );
      } catch { /* Local preference already saved; server flag syncs next subscribe. */ }
    })();
    return next;
  }, []);

  const onSubscribe = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus('denied'); return false; }

      const config = await fetchClientPushConfig(CLIENT_STORE.get(CLIENT_TOKEN_KEY));
      if (!config?.enabled || !config?.publicKey) { setPushStatus('unsupported'); return false; }

      const registration = await getRegistration();
      if (!registration) { setPushStatus('unsupported'); return false; }
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      });

      const { endpoint, keys } = await pushSubscriptionDetails(subscription);
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        // Never fabricate keys — surface a truthful failure instead.
        throw new Error('Browser did not provide subscription keys.');
      }

      await saveClientPushSubscription(
        { endpoint, keys, silent: !getSoundEnabled() },
        CLIENT_STORE.get(CLIENT_TOKEN_KEY)
      );
      if (alive.current) { setSubscribed(true); setPushStatus('ready'); }
      return true;
    } catch (err) {
      if (alive.current) setPushStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const onUnsubscribe = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const registration = await getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription?.endpoint) {
        await removeClientPushSubscription(subscription.endpoint, CLIENT_STORE.get(CLIENT_TOKEN_KEY));
        try { await subscription.unsubscribe(); } catch {}
      }
      if (alive.current) { setSubscribed(false); setPushStatus('ready'); }
      return true;
    } catch {
      if (alive.current) setPushStatus('error');
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { pushStatus, subscribed, soundEnabled, busy, onSubscribe, onUnsubscribe, toggleSound, refresh };
}

export default useClientPushSubscription;
