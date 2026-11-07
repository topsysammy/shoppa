import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, avatarTones, type AvatarTone } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Input } from '@/components/Input';
import { SettingsRow } from '@/components/SettingsRow';
import { cn } from '@/lib/cn';
import { applyTheme, useTheme, type ThemePref } from '@/lib/theme';
import { setPref, usePrefs } from '@/lib/prefs';
import { updateProfile } from '@/db/repo';
import { useAuth } from '@/features/auth/AuthProvider';
import { useListSummaries, useMyProfile } from '@/features/lists/data';
import { iconFor } from '@/features/lists/listMeta';
import { showToast } from '@/features/shell/toasts';
import { Group, GroupLabel, SettingsScaffold } from './Scaffold';

const toneName: Record<AvatarTone, string> = { ink: 'Green', blue: 'Blue', peach: 'Peach', lavender: 'Lavender', mint: 'Mint' };

/** Screen 54 Edit profile. Photos are out of scope (PRD), so the camera badge picks an avatar colour. */
export function EditProfilePage() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const profile = useMyProfile();
  const [name, setName] = useState('');
  const [tone, setTone] = useState<AvatarTone>('ink');
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || displayName);
      setTone(profile.avatarTone);
    }
  }, [profile, displayName]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ displayName: name, avatarTone: tone });
    showToast({ icon: 'check', message: 'Profile saved' });
    navigate('/profile');
  };

  return (
    <SettingsScaffold title="Edit profile">
      <form onSubmit={save} className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col items-center gap-3 pb-2">
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            aria-label="Change avatar colour"
            className="focus-ring relative rounded-full"
          >
            <Avatar size={72} name={name || 'You'} tone={tone} className="border-4" />
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex size-7 items-center justify-center rounded-full bg-brand-strong text-white ring-[3px] ring-surface">
              <Icon name="camera" size={14} />
            </span>
          </button>
          {picking ? (
            <div role="radiogroup" aria-label="Avatar colour" className="flex gap-2.5">
              {avatarTones.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tone === t}
                  aria-label={toneName[t]}
                  onClick={() => setTone(t)}
                  className={cn('focus-ring rounded-full p-0.5', tone === t && 'ring-2 ring-line-focus')}
                >
                  <Avatar size={36} name={name || 'You'} tone={t} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        <Input
          label="Email address"
          value={user?.email ?? ''}
          readOnly
          helper="Change it under Account."
          trailing={user?.email_confirmed_at ? <Badge label="Verified" tone="done" className="mr-2.5" /> : undefined}
        />
        <div className="mt-auto pt-6">
          <Button type="submit" disabled={!name.trim()}>
            Save changes
          </Button>
        </div>
      </form>
    </SettingsScaffold>
  );
}

/** Screen 57 Appearance: theme (synced to the profile) and Shopping Mode readability (this device). */
export function AppearancePage() {
  const [theme, setTheme] = useTheme();
  const prefs = usePrefs();
  const pick = (t: ThemePref) => {
    setTheme(t);
    applyTheme(t);
    void updateProfile({ theme: t });
  };
  const previews: Array<{ id: ThemePref; label: string }> = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];
  return (
    <SettingsScaffold title="Appearance">
      <GroupLabel>Theme</GroupLabel>
      <div role="radiogroup" aria-label="Theme" className="flex gap-2.5">
        {previews.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={theme === p.id}
            onClick={() => pick(p.id)}
            className="focus-ring flex min-w-0 flex-1 flex-col items-center gap-2.5 rounded-18"
          >
            <span
              className={cn(
                'flex h-[150px] w-full flex-col gap-2 overflow-hidden rounded-18 border-[1.5px] p-3',
                theme === p.id ? 'border-brand-strong' : 'border-line',
              )}
              style={{
                background: p.id === 'light' ? '#f4f4f5' : p.id === 'dark' ? '#111113' : 'linear-gradient(90deg,#f4f4f5 50%,#111113 50%)',
              }}
              aria-hidden
            >
              <span className="h-2.5 w-[52px] rounded-[5px]" style={{ background: p.id === 'light' ? '#1c1c1e' : p.id === 'dark' ? '#f2f2f3' : '#8e8e93' }} />
              <span className="h-[26px] w-full rounded-[6px]" style={{ background: p.id === 'light' ? '#fff' : p.id === 'dark' ? '#232326' : '#c7c7cc' }} />
              <span className="h-[26px] w-full rounded-[6px]" style={{ background: p.id === 'light' ? '#fff' : p.id === 'dark' ? '#232326' : '#c7c7cc' }} />
              <span className="h-1.5 w-[60px] rounded-[3px] bg-brand" />
            </span>
            <span
              className={cn('inline-flex size-5 items-center justify-center rounded-full border-2', theme === p.id ? 'border-brand-strong' : 'border-line-check')}
              aria-hidden
            >
              {theme === p.id ? <span className="size-2.5 rounded-full bg-brand-strong" /> : null}
            </span>
            <span className="type-body-medium text-ink">{p.label}</span>
          </button>
        ))}
      </div>
      <GroupLabel>Readability</GroupLabel>
      <Group>
        <SettingsRow
          type="switch"
          label="Larger text in Shopping Mode"
          description="Easier to read while you walk the market"
          on={prefs.largeShopText}
          onChange={(v) => setPref('largeShopText', v)}
        />
        <SettingsRow
          type="switch"
          label="Keep screen on while shopping"
          description="Screen won’t dim in Shopping Mode"
          on={prefs.keepAwake}
          onChange={(v) => setPref('keepAwake', v)}
          last
        />
      </Group>
    </SettingsScaffold>
  );
}

/** Screen 58 Default list: where Quick Add drops new items. */
export function DefaultListPage() {
  const summaries = useListSummaries();
  const profile = useMyProfile();
  const current = profile?.defaultListId ?? null;
  const options = [
    ...(summaries ?? []).map((s) => ({
      id: s.list.id as string | null,
      title: s.list.title,
      sub: `${s.stats.total} ${s.stats.total === 1 ? 'item' : 'items'}${s.members.length > 1 ? ' · shared' : ''}`,
      icon: iconFor(s.list.icon),
    })),
    { id: null, title: 'Last list I used', sub: 'Changes automatically', icon: 'clock' as const },
  ];
  const tints = ['bg-avatar-mint', 'bg-avatar-blue', 'bg-avatar-peach', 'bg-avatar-lavender'];
  return (
    <SettingsScaffold title="Default list" intro="Quick Add drops new items here unless you pick another list.">
      <div role="radiogroup" aria-label="Default list" className="flex flex-col gap-2.5">
        {options.map((o, i) => (
          <button
            key={o.id ?? 'last'}
            type="button"
            role="radio"
            aria-checked={current === o.id}
            onClick={() => void updateProfile({ defaultListId: o.id })}
            className={cn(
              'focus-ring flex items-center gap-3.5 rounded-18 border bg-surface p-3.5 text-left',
              current === o.id ? 'border-[1.5px] border-line-focus' : 'border-line hover:bg-muted',
            )}
          >
            <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink', o.id ? tints[i % tints.length] : 'bg-muted')}>
              <Icon name={o.icon} size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate type-body-strong text-ink">{o.title}</span>
              <span className="type-small text-secondary">{o.sub}</span>
            </span>
            <span className={cn('inline-flex size-5 items-center justify-center rounded-full border-2', current === o.id ? 'border-brand-strong' : 'border-line-check')} aria-hidden>
              {current === o.id ? <span className="size-2.5 rounded-full bg-brand-strong" /> : null}
            </span>
          </button>
        ))}
      </div>
    </SettingsScaffold>
  );
}
