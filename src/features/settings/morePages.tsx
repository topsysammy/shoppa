import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { SettingsRow } from '@/components/SettingsRow';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { getSettings, updateProfile, updateSettings } from '@/db/repo';
import { cn } from '@/lib/cn';
import { setPref, usePrefs } from '@/lib/prefs';
import { local } from '@/lib/storage';
import { appUrl, supabase } from '@/lib/supabase/client';
import { authMessage } from '@/lib/supabase/errors';
import { defaultUnitPrefs, unitChipLabel, units as allUnits } from '@/lib/units';
import { useOnline } from '@/lib/useOnline';
import { useAuth } from '@/features/auth/AuthProvider';
import { appleEnabled } from '@/features/auth/ui';
import { useMyProfile } from '@/features/lists/data';
import { disablePush, enablePush, permission, pushSupport } from '@/features/notifications/push';
import { showToast } from '@/features/shell/toasts';
import { Group, GroupLabel, SettingsScaffold } from './Scaffold';

// 55 Account ------------------------------------------------------------------------

export function AccountPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const online = useOnline();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const providers = new Set((user?.identities ?? []).map((i) => i.provider));

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: err } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: appUrl('/settings/account') });
    if (err) return setError(authMessage(err));
    setEmailOpen(false);
    showToast({ icon: 'mail', message: `Check ${email.trim()} to confirm the change` });
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: appUrl('/reset') });
    showToast(err ? { icon: 'alert', message: authMessage(err) } : { icon: 'mail', message: `We sent a link to ${user.email} to set a new password` });
  };

  const link = async (provider: 'google' | 'apple') => {
    const { error: err } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: appUrl('/settings/account') } });
    if (err) showToast({ icon: 'alert', message: authMessage(err) });
  };

  const everywhere = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <SettingsScaffold title="Account">
      <GroupLabel>Login</GroupLabel>
      <Group>
        <SettingsRow type="link" label="Email" value={user?.email} onClick={() => (setEmail(user?.email ?? ''), setEmailOpen(true))} />
        <SettingsRow type="link" label="Change password" onClick={() => void resetPassword()} last />
      </Group>
      <GroupLabel>Connected sign-in</GroupLabel>
      <Group>
        <ProviderRow label="Google" connected={providers.has('google')} onConnect={() => void link('google')} disabled={!online} last={!appleEnabled} />
        {appleEnabled ? <ProviderRow label="Apple" connected={providers.has('apple')} onConnect={() => void link('apple')} disabled={!online} last /> : null}
      </Group>
      <GroupLabel>Sessions</GroupLabel>
      <Group>
        <div className="flex flex-col border-b border-line px-4 py-3.5">
          <span className="type-body-medium text-ink">This device</span>
          <span className="type-caption text-secondary">Active now</span>
        </div>
        <SettingsRow type="link" label="Log out of all devices" onClick={() => void everywhere()} last />
      </Group>
      <div className="pt-3">
        <Button variant="secondary" className="border-danger/30 text-danger" onClick={() => navigate('/settings/delete')}>
          Delete account
        </Button>
      </div>
      {!online ? <p className="type-caption text-secondary">Account changes need a connection.</p> : null}

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} variant="dialog" size="sm" title="Change email">
        <form onSubmit={changeEmail} className="flex flex-col gap-4">
          <Input label="New email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} autoComplete="email" />
          <p className="type-caption text-secondary">We&rsquo;ll send a confirmation link to the new address. Your email changes after you tap it.</p>
          <Button type="submit" disabled={!online || !email.trim() || email.trim() === user?.email}>
            Send confirmation
          </Button>
        </form>
      </Modal>
    </SettingsScaffold>
  );
}

function ProviderRow({ label, connected, onConnect, disabled, last }: { label: string; connected: boolean; onConnect: () => void; disabled?: boolean; last?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', !last && 'border-b border-line')}>
      <Icon name={label === 'Apple' ? 'apple' : 'user'} size={20} className="text-ink" />
      <span className="flex-1 type-body-medium text-ink">{label}</span>
      {connected ? (
        <span className="rounded-full bg-done px-3 py-1 type-small-strong text-white">Connected</span>
      ) : (
        <button type="button" onClick={onConnect} disabled={disabled} className="focus-ring min-h-11 rounded-full border border-line-strong px-4 type-label text-ink disabled:opacity-50">
          Connect
        </button>
      )}
    </div>
  );
}

// 56 Notification settings ------------------------------------------------------------------

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function NotificationSettingsPage() {
  const s = useLiveQuery(() => getSettings(), []);
  const [busy, setBusy] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const support = pushSupport();
  if (!s) return <SettingsScaffold title="Notifications">{null}</SettingsScaffold>;

  const togglePush = async (on: boolean) => {
    setBusy(true);
    if (on) {
      if (support === 'needs-install') {
        showToast({ icon: 'bell', message: 'On iPhone, add Shoppa to your Home Screen first.' });
      } else if (support === 'supported') {
        const r = await enablePush();
        if (r !== 'granted') showToast({ icon: 'alert', message: r === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Couldn’t turn on notifications.' });
      }
    } else {
      await disablePush();
    }
    await updateSettings({ pushEnabled: on });
    setBusy(false);
  };

  const blocked = permission() === 'denied';
  const [h, m] = s.remindTime.split(':');
  const remindLabel = `Every ${days[s.remindDay]} · ${new Date(2000, 0, 1, Number(h), Number(m)).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}`;

  return (
    <SettingsScaffold title="Notifications">
      <Group>
        <SettingsRow
          type="switch"
          label="Push notifications"
          description={
            support === 'unsupported' || support === 'not-configured'
              ? 'Not available in this browser. You’ll still see everything in the inbox.'
              : blocked
                ? 'Blocked in browser settings. Allow notifications for this site to turn on.'
                : 'Allow Shoppa to send notifications'
          }
          on={s.pushEnabled && !busy}
          onChange={(v) => void togglePush(v)}
          last
        />
      </Group>
      <GroupLabel>Shared lists</GroupLabel>
      <Group>
        <SettingsRow type="switch" label="Invitations" description="When someone joins a list you’re on" on={s.invitations} onChange={(v) => void updateSettings({ invitations: v })} />
        <SettingsRow type="switch" label="List activity" description="Items added or edited by others, and finished trips" on={s.listActivity} onChange={(v) => void updateSettings({ listActivity: v })} />
        <SettingsRow type="switch" label="Shopping updates" description="Progress while someone shops your list" on={s.shoppingUpdates} onChange={(v) => void updateSettings({ shoppingUpdates: v })} last />
      </Group>
      <GroupLabel>Reminders</GroupLabel>
      <Group>
        <SettingsRow type="switch" label="Shopping reminders" description="Nudge me about lists with items left" on={s.reminders} onChange={(v) => void updateSettings({ reminders: v })} />
        <SettingsRow type="link" label="Remind me" description={remindLabel} onClick={() => setRemindOpen(true)} last />
      </Group>
      <p className="px-1 type-caption text-secondary">These choices apply on all your devices. The inbox always shows everything.</p>

      <Modal open={remindOpen} onClose={() => setRemindOpen(false)} variant="dialog" size="sm" title="Remind me">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="type-label text-body">Day</span>
            <select
              value={s.remindDay}
              onChange={(e) => void updateSettings({ remindDay: Number(e.target.value) })}
              className="focus-ring h-[52px] rounded-12 border border-line-strong bg-surface px-4 type-body text-ink"
            >
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Input label="Time" type="time" value={s.remindTime} onChange={(e) => e.target.value && void updateSettings({ remindTime: e.target.value })} />
          <Button onClick={() => setRemindOpen(false)}>Done</Button>
        </div>
      </Modal>
    </SettingsScaffold>
  );
}

// 59 Units -------------------------------------------------------------------------------

export function UnitsPage() {
  const profile = useMyProfile();
  const prefs = profile?.unitPrefs ?? defaultUnitPrefs;
  const system = profile?.unitSystem ?? 'metric';
  const [adding, setAdding] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const countAndWeight = allUnits.filter((u) => u.group !== 'market' && (system === 'imperial' ? !['g', 'ml'].includes(u.id) : !['lb', 'oz'].includes(u.id)));

  const toggleQuick = (id: string) => {
    const quick = prefs.quick.includes(id) ? prefs.quick.filter((q) => q !== id) : [...prefs.quick, id];
    void updateProfile({ unitPrefs: { ...prefs, quick } });
  };
  const removeMarket = (id: string) => void updateProfile({ unitPrefs: { ...prefs, market: prefs.market.filter((m) => m !== id) } });
  const addMarket = (e: FormEvent) => {
    e.preventDefault();
    const v = newUnit.trim().toLowerCase().slice(0, 24);
    if (!v) return;
    if (!prefs.market.includes(v)) void updateProfile({ unitPrefs: { ...prefs, market: [...prefs.market, v] } });
    setNewUnit('');
    setAdding(false);
  };

  return (
    <SettingsScaffold title="Units">
      <GroupLabel>Measurement system</GroupLabel>
      <div role="radiogroup" aria-label="Measurement system" className="flex rounded-full bg-muted p-1">
        {(
          [
            ['metric', 'Metric (kg, litres)'],
            ['imperial', 'Imperial (lb, oz)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={system === id}
            onClick={() => void updateProfile({ unitSystem: id })}
            className={cn('focus-ring min-h-11 flex-1 rounded-full px-3 type-label', system === id ? 'bg-surface text-ink shadow-card' : 'text-secondary')}
          >
            {label}
          </button>
        ))}
      </div>
      <GroupLabel>Default units</GroupLabel>
      <p className="-mt-2 px-1 type-caption text-secondary">The first four you pick show as quick choices when adding an item.</p>
      <div className="flex flex-wrap gap-2">
        {countAndWeight.map((u) => (
          <Chip key={u.id} label={unitChipLabel(u.id)} state={prefs.quick.includes(u.id) ? 'selected' : 'default'} onClick={() => toggleQuick(u.id)} />
        ))}
      </div>
      <GroupLabel>My market measures</GroupLabel>
      <p className="-mt-2 px-1 type-caption text-secondary">Add the measures your market uses.</p>
      <div className="flex flex-wrap gap-2">
        {prefs.market.map((m) => (
          <span key={m} className="inline-flex h-9 items-center gap-1 rounded-full border border-line-strong bg-surface pl-4 pr-1 text-[14px] font-medium text-ink">
            {m}
            <button type="button" onClick={() => removeMarket(m)} aria-label={`Remove ${m}`} className="focus-ring inline-flex size-9 items-center justify-center rounded-full hover:bg-muted">
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
        {adding ? (
          <form onSubmit={addMarket} className="flex items-center gap-2">
            <label htmlFor="new-unit" className="sr-only">
              New market measure
            </label>
            <input
              id="new-unit"
              autoFocus
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              maxLength={24}
              placeholder="e.g. heap"
              className="h-9 w-28 rounded-full border-[1.5px] border-line-focus bg-surface px-3 text-[14px] text-ink focus:outline-none"
            />
            <button type="submit" className="focus-ring inline-flex h-9 items-center rounded-full bg-brand-strong px-4 type-label text-on-brand">
              Add
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="focus-ring inline-flex h-9 items-center rounded-full bg-brand-strong px-4 type-label text-on-brand">
            + Add unit
          </button>
        )}
      </div>
    </SettingsScaffold>
  );
}

// 60 Privacy & legal -------------------------------------------------------------------------

/** PRD section 8 privacy: export on request. Builds a JSON file from this device's synced copy. */
async function downloadMyData(email?: string) {
  const [lists, items, profiles, activity] = await Promise.all([db.lists.toArray(), db.items.toArray(), db.profiles.toArray(), db.activity.toArray()]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { email },
    lists: lists.filter((l) => !l.deletedAt).map((l) => ({ ...l, items: items.filter((i) => i.listId === l.id && !i.deletedAt) })),
    activity,
    people: profiles.map((p) => ({ id: p.id, name: p.displayName })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shoppa-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function PrivacyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefs = usePrefs();
  return (
    <SettingsScaffold title="Privacy & legal">
      <p className="flex items-center gap-3 rounded-18 bg-brand-strong px-4 py-3.5 type-caption text-on-brand">
        <Icon name="shield" size={20} className="shrink-0" />
        Your lists are private. Only people you invite can see a shared list. We never sell your data.
      </p>
      <GroupLabel>Data</GroupLabel>
      <Group>
        <SettingsRow
          type="switch"
          label="Share usage analytics"
          description="Anonymous, cookie-free stats that help us improve. Never your item names."
          on={prefs.analytics}
          onChange={(v) => setPref('analytics', v)}
        />
        <SettingsRow type="link" label="Download my data" description="Get a copy of your lists and items" onClick={() => void downloadMyData(user?.email)} />
        <SettingsRow
          type="link"
          label="Clear search history"
          onClick={() => {
            local.remove('shoppa.recentSearches');
            showToast({ icon: 'check', message: 'Search history cleared' });
          }}
          last
        />
      </Group>
      <GroupLabel>Legal</GroupLabel>
      <Group>
        <SettingsRow type="link" label="Privacy Policy" onClick={() => navigate('/legal/privacy')} />
        <SettingsRow type="link" label="Terms of Service" onClick={() => navigate('/legal/terms')} last />
      </Group>
      <div className="pt-3">
        <Button variant="secondary" className="border-danger/30 text-danger" onClick={() => navigate('/settings/delete')}>
          Delete account and data
        </Button>
      </div>
    </SettingsScaffold>
  );
}

// 61 Help & support ------------------------------------------------------------------------------

const faqs = [
  {
    q: 'How do I share a list?',
    a: 'Open the list, tap the share button, then choose WhatsApp, Messages, Email or Copy link. Anyone with the link can join for 7 days.',
  },
  {
    q: 'Does Shoppa work without data?',
    a: 'Yes. Everything you add, tick or delete is saved on your phone first and syncs when you’re back online. Signing in and joining a shared list need a connection.',
  },
  {
    q: 'What is Shopping Mode?',
    a: 'A big, simple view for the market: tap a row to put it in the bag. The screen stays on and it works offline.',
  },
  {
    q: 'Why aren’t my changes syncing?',
    a: 'Check your connection. Your changes are safe on this device and Shoppa keeps retrying. You can tap Try again on the sync banner.',
  },
  {
    q: 'How do I add Shoppa to my home screen?',
    a: 'On Android, tap Install when Shoppa offers it, or use the browser menu. On iPhone, tap Share in Safari, then Add to Home Screen.',
  },
];

/** Open question in the PRD: support email and WhatsApp number. Set these before launch. */
const SUPPORT_EMAIL = 'support@shoppa.app';
const SUPPORT_WHATSAPP = '';

export function HelpPage() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const shown = faqs.filter((f) => !q.trim() || (f.q + f.a).toLowerCase().includes(q.trim().toLowerCase()));
  const version = import.meta.env.VITE_APP_VERSION ?? '0.1.0';
  return (
    <SettingsScaffold title="Help & Support">
      <label className="flex h-[52px] items-center gap-2.5 rounded-full border border-line-strong bg-surface px-4">
        <Icon name="search" size={20} className="text-ink" />
        <span className="sr-only">Search help articles</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles" className="min-w-0 flex-1 bg-transparent type-body text-ink placeholder:text-tertiary focus:outline-none" />
      </label>
      <GroupLabel>Common questions</GroupLabel>
      <ul className="flex flex-col gap-2.5">
        {shown.map((f) => {
          const i = faqs.indexOf(f);
          const isOpen = open === i;
          return (
            <li key={f.q} className="rounded-16 border border-line bg-surface">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} className="focus-ring flex min-h-[52px] w-full items-center gap-3 rounded-16 px-4 text-left">
                <span className="flex-1 type-body-medium text-ink">{f.q}</span>
                <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={18} className="text-tertiary" />
              </button>
              {isOpen ? <p className="px-4 pb-4 type-body text-body">{f.a}</p> : null}
            </li>
          );
        })}
        {!shown.length ? <li className="py-4 text-center type-body text-secondary">No articles match. Contact us below.</li> : null}
      </ul>
      <GroupLabel>Contact us</GroupLabel>
      <div className="flex gap-2.5">
        {SUPPORT_WHATSAPP ? (
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="focus-ring flex min-h-[100px] flex-1 flex-col justify-end gap-1 rounded-20 bg-brand-strong p-4 text-on-brand">
            <span className="type-body-strong">WhatsApp</span>
            <span className="type-small">Replies in about 1 hr</span>
          </a>
        ) : null}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="focus-ring flex min-h-[100px] flex-1 flex-col justify-between gap-1 rounded-20 border border-line bg-surface p-4">
          <Icon name="mail" size={20} className="text-ink" />
          <span className="flex flex-col">
            <span className="type-body-strong text-ink">Email</span>
            <span className="type-small text-secondary">{SUPPORT_EMAIL}</span>
          </span>
        </a>
      </div>
      <p className="pt-2 text-center type-small text-secondary">
        Shoppa · version {version} ·{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Problem report')}&body=${encodeURIComponent(`\n\n---\nVersion ${version}\n${navigator.userAgent}`)}`}
          className="focus-ring rounded-[4px] font-semibold text-link"
        >
          Report a problem
        </a>
      </p>
    </SettingsScaffold>
  );
}
