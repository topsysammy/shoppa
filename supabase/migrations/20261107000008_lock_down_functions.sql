-- Security fix from the Supabase advisor (PRD section 8: only the anon key
-- in the browser, server-side checks). Postgres grants EXECUTE on every new
-- function to PUBLIC, so the earlier "revoke ... from anon" lines had no
-- effect. Revoke from PUBLIC, then grant back only what the app calls.

-- 1. Nobody (anon, authenticated) may call any public function by default.
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 2. RPCs the signed-in app calls.
grant execute on function public.create_invite(uuid, boolean) to authenticated;
grant execute on function public.revoke_invites(uuid) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.account_deletion_summary() to authenticated;

-- 3. Invite preview works before sign-in (H3).
grant execute on function public.invite_preview(text) to anon, authenticated;

-- 4. Helpers used inside RLS policies run as the querying role.
grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.is_list_owner(uuid) to authenticated;
grant execute on function public.shares_list_with(uuid) to authenticated;

-- Trigger functions (activity, fan-out, push webhook, sign-up, updated_at
-- and so on) don't need EXECUTE grants to fire, and log_activity /
-- purge_soft_deleted are only called by triggers and pg_cron.

-- 5. Pin search_path on the remaining trigger functions.
alter function public.set_updated_at() set search_path = '';
alter function public.lists_before_write() set search_path = '';
alter function public.items_before_write() set search_path = '';
alter function public.activity_before_insert() set search_path = '';
alter function public.notifications_guard() set search_path = '';
alter function public.profiles_check_default_list() set search_path = '';
