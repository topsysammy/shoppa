# Supabase setup

Shoppa uses one Supabase project for Postgres, Auth, Realtime and Edge Functions.
The browser only ever gets the **anon** key; every table has row-level security.

## 1. Create the project and connect the app

1. Create a project at supabase.com (region: closest to Nigeria, e.g. `eu-west`).
2. Project Settings > API: copy the Project URL and the `anon` public key.
3. In the repo: `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 2. Run the migrations

Either paste each file in `supabase/migrations/` (in name order) into SQL Editor > New query and run it,
or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

| Migration | Phase | What it does |
| --- | --- | --- |
| `20261107000001_profiles.sql` | 2 | `profiles` table, sign-up trigger, RLS (read and update own row only) |
| `20261107000002_lists_items.sql` | 3 | `lists`, `list_members`, `items`; server-time `updated_at`; RLS (members read and edit items, owner edits the list); realtime; 30-day purge |
| `20261107000003_activity.sql` | 4 | append-only `activity` (trip started / finished, more types in phase 5); RLS; realtime; 90-day purge |
| `20261107000004_sharing.sql` | 5 | `invites` + `create_invite` / `revoke_invites` / `invite_preview` / `accept_invite` (7-day, server-checked, rate limited); remove member and leave; co-members see names; item and member activity triggers |
| `20261107000005_notifications.sql` | 6 | `notification_settings`, `push_subscriptions`, `notifications` inbox; activity fan-out with 10-minute coalescing; realtime |
| `20261107000006_profile_settings.sql` | 7 | Units (metric / imperial, `unit_prefs`), profile `updated_at`, default-list check, owner transfer by service role only, `account_deletion_summary()` |
| `20261107000007_push_webhook.sql` | 6 | trigger that calls the `push` Edge Function (URL and secret from Vault) |
| `20261107000008_lock_down_functions.sql` | fix | revoke EXECUTE from PUBLIC; grant only the RPCs the app calls |

Optional: enable **pg_cron** (Database > Extensions) *before* running migration 2 so the daily purge of
soft-deleted rows is scheduled automatically. If you enable it later, run:
`select cron.schedule('shoppa-purge-soft-deleted', '17 3 * * *', 'select public.purge_soft_deleted()');`

## 3. Auth settings (Authentication in the dashboard)

**URL Configuration**
- Site URL: your deployed origin, e.g. `https://shoppa.app` (open question in PRD section 9).
- Redirect URLs (allow list):
  - `http://localhost:5173/**`
  - `http://<your-LAN-IP>:5173/**` (phone testing)
  - `https://*-<your-team>.vercel.app/**` (preview deploys)
  - `https://shoppa.app/**`

**Sign In / Providers > Email**
- Enable email provider, **Confirm email: off**. Sign-up signs people straight in; the verify-email
  screen (11, PRD A7) was removed by the product owner, so sign-up sends no email.
- Email OTP length: **6**. Email OTP expiration: **1800** seconds (screen 09 says "expires in 30 minutes").
- Password: minimum length **8**, required characters **letters and digits** (matches the sign-up rule).
- Secure password change: on.

**Email Templates** (free plan: only after you set up custom SMTP) — the links point at `/auth/confirm` with a `token_hash`, so a link opened in another
browser or on another device still works (A7).
- Reset Password: paste `templates/reset-password.html`, subject `Reset your Shoppa password`.

**Google (A2)**
1. Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the client ID and secret in Supabase: Sign In / Providers > Google.

**Apple (A2, P2)** — off by default. When configured, set `VITE_ENABLE_APPLE=true`.

**Rate limits** — keep the defaults (email sends are limited per hour; resend in the app waits 60 seconds).
For launch, set up a custom SMTP sender (Authentication > Emails > SMTP) so emails come from your domain;
the built-in sender is limited to a few emails per hour.

## 4. Web Push (N4)

1. Generate VAPID keys once: `npx web-push generate-vapid-keys`.
2. In the app's `.env.local` (and Vercel env): `VITE_VAPID_PUBLIC_KEY=<public key>`.
3. Edge Function secrets (Project Settings > Edge Functions, or `supabase secrets set`):
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:<support email>`,
   `PUSH_WEBHOOK_SECRET=<long random string>`.
4. Deploy the function: `supabase functions deploy push --no-verify-jwt`
   (the webhook authenticates with the secret header instead of a user JWT).
5. Migration 7 calls the function from a trigger. Give it the URL and secret once, in SQL Editor:
   `select vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');`
   `select vault.create_secret('https://<ref>.supabase.co/functions/v1/push', 'push_function_url');`

Coalesced updates ("Mum added 3 items") don't create new rows, so a burst sends one push.
iOS delivers push only when Shoppa is installed to the Home Screen (16.4+); everyone has the in-app inbox.
Shopping reminders (screen 56 "Remind me") are stored but not sent yet: they need a scheduled job.

## 5. Account deletion (P10)

Deploy: `supabase functions deploy delete-account` (keeps JWT verification on; the function checks the
caller's token itself too). It hands over shared lists the user chose to transfer, then deletes the auth
user; cascades remove their profile, settings, push subscriptions, inbox, memberships, invites and every list
they still own. Items they added to other people's lists stay, without a name. The app then clears
IndexedDB, Cache Storage and its local storage on that device.

## 6. Connected sign-in (screen 55)

"Connect" Google on the Account screen uses identity linking: enable **Manual linking** under
Authentication > Sign In / Providers (it is off by default).
