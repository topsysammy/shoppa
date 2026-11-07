// Supabase Edge Function: sends Web Push for new inbox rows (N4).
// Triggered by a Database Webhook on INSERT into public.notifications
// (see supabase/README.md). Runs with the service role key, which never
// reaches the browser. Respects each user's notification settings.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…),
//          PUSH_WEBHOOK_SECRET (sent by the webhook as x-webhook-secret).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

type Notification = {
  id: string;
  user_id: string;
  list_id: string | null;
  actor_id: string | null;
  type: 'member_joined' | 'items_added' | 'items_purchased' | 'trip_started' | 'trip_finished';
  count: number;
  payload: Record<string, unknown>;
};

const settingFor: Record<Notification['type'], 'invitations' | 'list_activity' | 'shopping_updates'> = {
  member_joined: 'invitations',
  items_added: 'list_activity',
  trip_finished: 'list_activity',
  items_purchased: 'shopping_updates',
  trip_started: 'shopping_updates',
};

const first = (name: string) => name.trim().split(/\s+/)[0] || 'Someone';

/** Push copy from Figma screen 52. */
function message(n: Notification, list: string, actor: string) {
  const names = (n.payload.names as string[] | undefined) ?? [];
  switch (n.type) {
    case 'items_added':
      return { title: list, body: `${actor} added ${names[0] ?? 'an item'} to ${list}.` };
    case 'items_purchased':
    case 'trip_started':
      return { title: `${actor} is shopping`, body: `${actor} started shopping ${list}.` };
    case 'trip_finished': {
      const b = n.payload.bought as number | undefined;
      const t = n.payload.total as number | undefined;
      return { title: 'All done', body: `${actor} finished shopping ${list}${b != null && t != null ? ` · ${b}/${t}` : ''}.` };
    }
    case 'member_joined':
      return { title: 'New member', body: `${actor} joined ${list}.` };
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const n = body?.record as Notification | undefined;
  if (!n?.user_id) return new Response('No record', { status: 400 });

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: settings } = await supa.from('notification_settings').select('*').eq('user_id', n.user_id).maybeSingle();
  if (!settings?.push_enabled || !settings[settingFor[n.type]]) return Response.json({ skipped: 'settings' });

  const [{ data: subs }, { data: list }, { data: actor }] = await Promise.all([
    supa.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id),
    n.list_id ? supa.from('lists').select('title').eq('id', n.list_id).maybeSingle() : Promise.resolve({ data: null }),
    n.actor_id ? supa.from('profiles').select('display_name').eq('id', n.actor_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!subs?.length) return Response.json({ skipped: 'no subscriptions' });

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const copy = message(n, list?.title ?? 'your list', first(actor?.display_name ?? 'Someone'));
  const payload = JSON.stringify({
    ...copy,
    tag: `${n.list_id ?? 'shoppa'}:${n.type}`,
    url: n.list_id ? `/lists/${n.list_id}` : '/notifications',
    notificationId: n.id,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'normal' });
        sent++;
        await supa.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Gone or invalid: the browser unsubscribed, so forget it.
        if (status === 404 || status === 410) await supa.from('push_subscriptions').delete().eq('id', s.id);
      }
    }),
  );
  if (sent) await supa.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id);
  return Response.json({ sent });
});
