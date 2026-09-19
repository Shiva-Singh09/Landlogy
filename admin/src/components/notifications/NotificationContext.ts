import { createContext, useContext, useEffect, useState } from 'react';
import type { AdminNotification } from '../../types/notification';
import { ApiError } from '../../services/api/client';
import { getPushConfig, saveSubscription, removeSubscription } from '../../services/api/notificationsApi';
export interface NotificationState {
  recent: AdminNotification[];
  banners: AdminNotification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string;
  busy: boolean;
  revision: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  dismiss: (id: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}
export const NotificationContext = createContext<NotificationState | null>(null);
export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('Notifications require the admin provider.');
  return value;
}

const toApplicationKey = (publicKey: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
  const binary = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const SOUND_PREFERENCE_KEY = 'landlogy_notification_sound';
const soundMuted = () => {
  try { return localStorage.getItem(SOUND_PREFERENCE_KEY) === 'off'; } catch { return false; }
};

// Browser push keys are ArrayBuffers; the API expects base64url strings.
const toBase64Url = (value: ArrayBuffer | null): string => {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function usePushSubscription() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error'>('idle');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const workerPath = '/sw-notifications.js';
    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setStatus('unsupported'); return; }
      try {
        // Single-worker architecture: reuse the app-lifecycle registration
        // from main.tsx when present; register only if it does not exist yet.
        // Same script URL/scope either way, so the browser keeps one worker.
        const registration = await navigator.serviceWorker.getRegistration() ?? await navigator.serviceWorker.register(workerPath);
        await navigator.serviceWorker.ready;
        // A blocked permission can never be re-prompted, so surface it first.
        if (Notification.permission === 'denied') { setStatus('denied'); return; }
        const config = await getPushConfig();
        if (!config.enabled || !config.publicKey) { setStatus('unsupported'); return; }
        const saved = localStorage.getItem('landlogy_push_subscribed') === 'true';
        if (!saved) { setStatus('granted'); return; }
        const existing = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
        setStatus('granted');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to initialize browser notifications.');
        setStatus('error');
      }
    };
    void check();
    return () => { /* registration persists beyond unmount */ };
  }, []);

  // Permission is only ever requested here, from the admin's click.
  // `silentOverride` lets the mute control re-sync the stored server flag without prompting.
  const subscribe = async (silentOverride?: boolean) => {
    if (status === 'unsupported') return;
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission === 'denied') { setStatus('denied'); setError('Notifications are blocked in your browser settings.'); return; }
      if (permission !== 'granted') { setError('Notification permission was dismissed. Enable it to receive browser notifications.'); return; }
      const registration = await navigator.serviceWorker.ready;
      const config = await getPushConfig();
      if (!config.publicKey) { setError('Browser notifications not configured on the server.'); return; }
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationKey(config.publicKey),
      });
      const record = {
        endpoint: subscription.endpoint,
        keys: { p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth')) },
        silent: typeof silentOverride === 'boolean' ? silentOverride : soundMuted(),
      };
      setStatus('granted');
      await saveSubscription(record);
      localStorage.setItem('landlogy_push_subscribed', 'true');
      setSubscribed(true);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to enable browser notifications.');
      setStatus('error');
    }
  };

    const unsubscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await removeSubscription(existing.endpoint);
        await existing.unsubscribe();
      }
      localStorage.removeItem('landlogy_push_subscribed');
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to disable browser notifications.');
    }
  };

  return { status, subscribed, error, subscribe, unsubscribe, soundMuted };
}
