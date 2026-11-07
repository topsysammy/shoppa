-- Phase 6 follow-up: call the `push` Edge Function for every new inbox row
-- (replaces the manual Database Webhook step in supabase/README.md).
-- The function URL and shared secret live in Supabase Vault, never in git:
--   select vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/push', 'push_function_url');
-- Until both exist this trigger does nothing, so the inbox keeps working.

create extension if not exists pg_net with schema extensions;

create or replace function public.notifications_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_url text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url' limit 1;
  if v_secret is null or v_url is null then
    return null;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

revoke execute on function public.notifications_push_webhook() from anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.notifications_push_webhook();
