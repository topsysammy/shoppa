// Supabase Edge Function: delete the caller's account (P10, screens 63-65).
// Kept for NDPA compliance. Verifies the caller's JWT, hands over any shared
// lists they chose to transfer (to an existing member), then deletes the auth
// user. Database cascades remove their profile, settings, push subscriptions,
// inbox, memberships, invites and every list they still own (with its items
// and activity). Items they added to other people's lists stay, unattributed.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Body = { confirm: string; transfers?: Array<{ list_id: string; to_user_id: string }> };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) return Response.json({ error: 'Not signed in' }, { status: 401, headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: who, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !who.user) return Response.json({ error: 'Not signed in' }, { status: 401, headers: cors });
  const uid = who.user.id;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (body?.confirm !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm' }, { status: 400, headers: cors });

  for (const t of body.transfers ?? []) {
    // Only lists the caller owns, only to someone already on the list.
    const { data: list } = await admin.from('lists').select('id, owner_id').eq('id', t.list_id).maybeSingle();
    if (!list || list.owner_id !== uid) continue;
    const { data: heir } = await admin.from('list_members').select('user_id').eq('list_id', t.list_id).eq('user_id', t.to_user_id).maybeSingle();
    if (!heir) continue;
    const a = await admin.from('lists').update({ owner_id: t.to_user_id }).eq('id', t.list_id);
    const b = await admin.from('list_members').update({ role: 'owner' }).eq('list_id', t.list_id).eq('user_id', t.to_user_id);
    if (a.error || b.error) return Response.json({ error: 'Couldn’t hand over a shared list. Nothing was deleted.' }, { status: 500, headers: cors });
  }

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return Response.json({ error: 'Couldn’t delete the account. Please try again.' }, { status: 500, headers: cors });
  return Response.json({ deleted: true }, { headers: cors });
});
