import { supabase } from '@/lib/supabase/client';
import { keys, local } from '@/lib/storage';
import { isIosSafari, isStandalone } from '@/pwa/install';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const DISMISS_DAYS = 14;

export type PushSupport = 'supported' | 'needs-install' | 'unsupported' | 'not-configured';

/** N4: iOS delivers Web Push only to installed PWAs (16.4+). */
export function pushSupport(): PushSupport {
  if (!VAPID) return 'not-configured';
  const ios = isIosSafari() || /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (ios && !isStandalone()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'supported';
}

export const permission = (): NotificationPermission | 'unsupported' =>
  'Notification' in window ? Notification.permission : 'unsupported';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ask the browser, subscribe and register the endpoint on the server. */
export async function enablePush(): Promise<'granted' | 'denied' | 'error'> {
  try {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID!) }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    if (error) return 'error';
    return 'granted';
  } catch {
    return 'error';
  }
}

/** Removes this browser's subscription (log out, or turning push off in settings). */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch {
    /* already gone */
  }
}

/**
 * W5: the pre-prompt shows only after the user shares or joins a list, never
 * on first load, and not again for 14 days after "Not now".
 */
export function shouldPrePrompt(): boolean {
  const s = pushSupport();
  if (s === 'unsupported' || s === 'not-configured') return false;
  if (s === 'supported' && permission() !== 'default') return false;
  const dismissed = Number(local.get(keys.pushPromptDismissed) ?? 0);
  return Date.now() - dismissed > DISMISS_DAYS * 86_400_000;
}

export const dismissPrePrompt = () => local.set(keys.pushPromptDismissed, String(Date.now()));
