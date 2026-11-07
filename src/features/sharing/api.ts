import { supabase } from '@/lib/supabase/client';
import { db } from '@/db/schema';
import { requestSync } from '@/sync/engine';
import { currentUserId } from '@/sync/currentUser';

/**
 * Online-only sharing calls (PRD section 8: invite join needs a connection).
 * Invite tokens are created and checked on the server (sync rule 5).
 */

export type Invite = { token: string; expiresAt: string };

export type InvitePreview =
  | { status: 'not_found' | 'revoked' | 'expired' }
  | {
      status: 'ok';
      list_id: string;
      title: string;
      expires_at: string;
      inviter: { name: string; tone: string } | null;
      member_count: number;
      item_count: number;
      members: Array<{ name: string; tone: string }>;
      items: Array<{ name: string; quantity: number | null; unit: string | null }>;
      is_member: boolean;
    };

export class SharingError extends Error {}

function fail(error: { message: string; code?: string } | null, fallback: string): never {
  if (!navigator.onLine) throw new SharingError('You’re offline. Connect to the internet and try again.');
  throw new SharingError(error?.message && !/fetch|network/i.test(error.message) ? error.message : fallback);
}

/** H1: the owner's active invite link, created on first use. */
export async function getInvite(listId: string, forceNew = false): Promise<Invite> {
  const { data, error } = await supabase.rpc('create_invite', { p_list_id: listId, p_force_new: forceNew });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) fail(error, 'Couldn’t create an invite link.');
  return { token: row.token, expiresAt: row.expires_at };
}

/** Owner's current link without creating one (Members screen 46). */
export async function activeInvite(listId: string): Promise<Invite | null> {
  const { data, error } = await supabase
    .from('invites')
    .select('token, expires_at')
    .eq('list_id', listId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error, 'Couldn’t load the invite link.');
  return data ? { token: data.token, expiresAt: data.expires_at } : null;
}

export async function revokeInvites(listId: string) {
  const { error } = await supabase.rpc('revoke_invites', { p_list_id: listId });
  if (error) fail(error, 'Couldn’t disable the link.');
}

/** H3: works logged out. */
export async function previewInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('invite_preview', { p_token: token });
  if (error) fail(error, 'Couldn’t open this invitation.');
  return data as InvitePreview;
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
  if (error || !data) fail(error, 'This invitation is no longer available.');
  requestSync('manual');
  return data as string;
}

/** Owner only (RLS). */
export async function removeMember(listId: string, userId: string) {
  const { error } = await supabase.from('list_members').delete().eq('list_id', listId).eq('user_id', userId);
  if (error) fail(error, 'Couldn’t remove this member.');
  await db.members.delete(`${listId}:${userId}`);
  requestSync('manual');
}

/** Members leave; owners delete the list instead (PRD section 7). */
export async function leaveList(listId: string) {
  const me = currentUserId();
  const { error } = await supabase.from('list_members').delete().eq('list_id', listId).eq('user_id', me ?? '');
  if (error) fail(error, 'Couldn’t leave this list.');
  await db.transaction('rw', [db.members, db.lists, db.items, db.activity], async () => {
    await db.members.where('listId').equals(listId).delete();
    await db.items.where('listId').equals(listId).delete();
    await db.activity.where('listId').equals(listId).delete();
    await db.lists.delete(listId);
  });
}

export const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`;

/** "shoppa.app/join/8Fk2…" for display. */
export const shortInvite = (token: string) => `${window.location.host}/join/${token.slice(0, 8)}…`;

/**
 * Pre-filled share message (PRD open question: WhatsApp wording). Uses the
 * Figma screen 38 copy until the wording is decided.
 */
export function shareMessage(sender: string, title: string, itemCount: number, url: string) {
  return `${sender} shared ${title} (${itemCount} ${itemCount === 1 ? 'item' : 'items'}) with you. Open it on Shoppa: ${url}`;
}

export const formatExpiry = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
