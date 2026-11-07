import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { clearLocalData } from '@/db/schema';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase/client';
import { useOnline } from '@/lib/useOnline';
import { disablePush } from '@/features/notifications/push';
import { stopSync } from '@/sync/engine';
import { SettingsScaffold } from './Scaffold';

type Summary = {
  personal: number;
  joined: Array<{ id: string; title: string }>;
  shared_owned: Array<{ id: string; title: string; heir: { user_id: string; name: string } | null }>;
};

/**
 * P10: clears everything Shoppa keeps in this browser: IndexedDB, Cache
 * Storage and the app's localStorage / sessionStorage keys.
 */
export async function wipeDevice() {
  stopSync();
  await clearLocalData().catch(() => undefined);
  try {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  } catch {
    /* no Cache Storage */
  }
  for (const store of [localStorage, sessionStorage]) {
    try {
      Object.keys(store)
        .filter((k) => k.startsWith('shoppa.') || k.startsWith('sb-'))
        .forEach((k) => store.removeItem(k));
    } catch {
      /* storage blocked */
    }
  }
}

/** Screens 63 Delete account and 64 Confirm deletion (P10: type DELETE). Needs a connection. */
export function DeleteAccountPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [choice, setChoice] = useState<Record<string, 'transfer' | 'delete'>>({});
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!online) return;
    void supabase.rpc('account_deletion_summary').then(({ data, error: err }) => {
      if (err) return setError('Couldn’t load your account details. Try again.');
      const s = data as Summary;
      setSummary(s);
      setChoice(Object.fromEntries(s.shared_owned.map((l) => [l.id, l.heir ? 'transfer' : 'delete'])));
    });
  }, [online]);

  const transfers = (summary?.shared_owned ?? []).filter((l) => choice[l.id] === 'transfer' && l.heir).map((l) => ({ list_id: l.id, to_user_id: l.heir!.user_id }));

  const remove = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.functions.invoke('delete-account', { body: { confirm: typed.trim(), transfers } });
    if (err) {
      setBusy(false);
      setError('Couldn’t delete your account. Check your connection and try again.');
      return;
    }
    await disablePush();
    await wipeDevice();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    navigate('/account-deleted', { replace: true });
  };

  if (!online) {
    return (
      <SettingsScaffold title="Delete account">
        <p className="flex items-center gap-2 rounded-16 bg-muted p-4 type-body text-body">
          <Icon name="wifi-off" size={18} /> Deleting your account needs a connection.
        </p>
      </SettingsScaffold>
    );
  }

  const heirs = (summary?.shared_owned ?? []).filter((l) => choice[l.id] === 'transfer' && l.heir);

  return (
    <SettingsScaffold title="Delete account" intro="Here’s what happens before you decide.">
      {!summary ? (
        error ? <p className="type-body text-danger">{error}</p> : <p className="type-body text-secondary" aria-busy="true">Loading…</p>
      ) : (
        <>
          <Card icon="trash" tint="bg-danger-tint text-danger" title={`Your ${summary.personal} personal ${summary.personal === 1 ? 'list is' : 'lists are'} deleted`} body="Including every item and your search history." />
          {summary.joined.length ? (
            <Card
              icon="users"
              tint="bg-yellow text-on-yellow"
              title={`You leave ${summary.joined.length} ${summary.joined.length === 1 ? 'list' : 'lists'} shared with you`}
              body={`${summary.joined.map((l) => l.title).join(' and ')} stay with ${summary.joined.length === 1 ? 'its owner' : 'their owners'}. Items you added stay.`}
            />
          ) : null}
          {summary.shared_owned.map((l) => (
            <fieldset key={l.id} className="flex flex-col gap-2.5">
              <Card icon="home" tint="bg-avatar-blue text-avatar-blue-text" title="You own a shared list" body={`Choose what happens to ${l.title}:`} />
              {l.heir ? (
                <Option checked={choice[l.id] === 'transfer'} onClick={() => setChoice((c) => ({ ...c, [l.id]: 'transfer' }))} label={`Give ownership to ${l.heir.name.split(' ')[0]}`} />
              ) : null}
              <Option checked={choice[l.id] === 'delete'} onClick={() => setChoice((c) => ({ ...c, [l.id]: 'delete' }))} label="Delete it for everyone" />
            </fieldset>
          ))}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Continue
            </Button>
            <button type="button" onClick={() => navigate('/profile')} className="focus-ring mx-auto min-h-11 rounded-12 px-3 type-body-strong text-link">
              Keep my account
            </button>
          </div>
        </>
      )}

      <Modal open={confirm} onClose={() => !busy && setConfirm(false)} variant="dialog" size="sm" title="Confirm deletion">
        <div className="flex flex-col gap-3">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-danger-tint text-danger">
            <Icon name="alert" size={24} />
          </span>
          <p className="type-title text-ink">Delete account permanently?</p>
          <p className="type-caption text-secondary">
            This permanently removes your account and its data from Shoppa and this device.
            {heirs.length ? ` ${heirs.map((l) => `${l.title} will move to ${l.heir!.name.split(' ')[0]}`).join('. ')}.` : ''}
          </p>
          <Input
            label="Type DELETE to confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="[&_input]:tracking-[2px]"
            error={error || undefined}
          />
          <div className="mt-1 flex flex-col gap-2.5">
            <Button variant="danger" disabled={typed.trim() !== 'DELETE'} loading={busy} onClick={() => void remove()}>
              Delete Account
            </Button>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </SettingsScaffold>
  );
}

function Card({ icon, tint, title, body }: { icon: 'trash' | 'users' | 'home'; tint: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-18 border border-line bg-surface p-3.5">
      <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full', tint)}>
        <Icon name={icon} size={18} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="type-body-strong text-ink">{title}</span>
        <span className="type-caption text-secondary">{body}</span>
      </span>
    </div>
  );
}

function Option({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn('focus-ring flex items-center gap-3 rounded-18 border bg-surface px-4 py-3.5 text-left', checked ? 'border-[1.5px] border-line-focus' : 'border-line')}
    >
      <span className={cn('inline-flex size-5 items-center justify-center rounded-full border-2', checked ? 'border-brand-strong' : 'border-line-check')} aria-hidden>
        {checked ? <span className="size-2.5 rounded-full bg-brand-strong" /> : null}
      </span>
      <span className="type-body-medium text-ink">{label}</span>
    </button>
  );
}

/** Screen 65 Account deleted. */
export function AccountDeletedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col items-center canvas-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center" role="status">
          <span className="inline-flex size-24 items-center justify-center rounded-full bg-surface text-ink">
            <Icon name="check" size={40} />
          </span>
          <h1 className="type-display text-ink">Your account has been deleted</h1>
          <p className="type-body text-secondary">Your lists and personal data have been removed. Thanks for shopping with Shoppa.</p>
        </div>
        <Button onClick={() => navigate('/', { replace: true })}>Back to start</Button>
      </main>
    </div>
  );
}
