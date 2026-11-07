import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { SettingsRow } from '@/components/SettingsRow';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { getSettings } from '@/db/repo';
import { useIsDesktop } from '@/lib/useMedia';
import { useOnline } from '@/lib/useOnline';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useListSummaries, useMyProfile } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { currentUserId } from '@/sync/currentUser';

/** Screen 53 Profile & settings, also the left pane of settings on desktop. */
export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const profile = useMyProfile();
  const summaries = useListSummaries();
  const [theme] = useTheme();
  const settings = useLiveQuery(() => getSettings(), []);
  const trips = useLiveQuery(async () => (await db.activity.toArray()).filter((a) => a.type === 'trip_finished' && a.actorId === currentUserId()).length, []);
  const [logout, setLogout] = useState(false);
  const name = profile?.displayName || displayName || 'You';
  const defaultList = summaries?.find((s) => s.list.id === profile?.defaultListId)?.list.title ?? 'Last list used';
  const shared = summaries?.filter((s) => s.members.length > 1).length ?? 0;

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:min-h-dvh">
      <header className="px-5 pt-[max(20px,env(safe-area-inset-top))] desktop:pt-6">
        <h1 className="text-center type-title text-ink">Profile</h1>
        <div className="mt-5 flex items-center gap-4">
          <Avatar size={72} name={name} tone={profile?.avatarTone ?? 'ink'} className="border-4" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate type-title text-ink">{name}</span>
            <span className="truncate type-caption text-secondary">{user?.email}</span>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="focus-ring mt-1 inline-flex h-9 w-fit items-center rounded-full bg-brand-strong px-3.5 type-label text-on-brand"
            >
              Edit profile
            </button>
          </div>
        </div>
      </header>
      <section className="mt-5 flex flex-1 flex-col gap-3 rounded-t-32 bg-surface px-5 pb-8 pt-5">
        <div className="flex gap-2.5">
          <Stat icon="bag" tint="bg-avatar-mint text-avatar-mint-text" value={trips ?? 0} label="Shopping trips" />
          <Stat icon="users" tint="bg-avatar-peach text-avatar-peach-text" value={shared} label="Shared lists" />
        </div>
        <div className="overflow-hidden rounded-20 border border-line">
          <SettingsRow type="link" icon="user" label="Account" onClick={() => navigate('/settings/account')} />
          <SettingsRow
            type="link"
            icon="bell"
            label="Notifications"
            value={settings ? (settings.pushEnabled ? 'On' : 'Off') : undefined}
            onClick={() => navigate('/settings/notifications')}
          />
          <SettingsRow type="link" icon="moon" label="Appearance" value={theme[0]!.toUpperCase() + theme.slice(1)} onClick={() => navigate('/settings/appearance')} />
          <SettingsRow type="link" icon="bag" label="Default list" value={defaultList} onClick={() => navigate('/settings/default-list')} />
          <SettingsRow type="link" icon="ruler" label="Units" onClick={() => navigate('/settings/units')} />
          <SettingsRow type="link" icon="shield" label="Privacy & legal" onClick={() => navigate('/settings/privacy')} />
          <SettingsRow type="link" icon="help" label="Help & Support" onClick={() => navigate('/settings/help')} last />
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="md" onClick={() => setLogout(true)}>
            Log out
          </Button>
          <Button variant="secondary" size="md" className="border-danger/30 text-danger" onClick={() => navigate('/settings/delete')}>
            Delete account
          </Button>
        </div>
      </section>
      <LogoutDialog open={logout} onClose={() => setLogout(false)} />
    </div>
  );
}

export function ProfilePage() {
  const desktop = useIsDesktop();
  if (!desktop) return <ProfileMenu />;
  return (
    <div className="flex min-h-dvh">
      <div className="w-[380px] shrink-0 overflow-y-auto border-r border-line">
        <ProfileMenu />
      </div>
      <div className="flex flex-1">
        <EmptyState icon="settings" title="Settings" body="Choose a setting on the left." />
      </div>
    </div>
  );
}

function Stat({ icon, tint, value, label }: { icon: 'bag' | 'users'; tint: string; value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-20 border border-line bg-surface p-3.5">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="flex flex-col">
        <span className="type-body-strong text-ink">{value}</span>
        <span className="type-small text-secondary">{label}</span>
      </span>
    </div>
  );
}

/** Screen 62 Log out. Warns when changes haven't reached the server yet. */
export function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const online = useOnline();
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await signOut();
    navigate('/', { replace: true });
  };
  return (
    <Modal open={open} onClose={onClose} variant="dialog" size="sm" title="Log out">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted text-ink">
          <Icon name="logout" size={24} />
        </span>
        <p className="type-title text-ink">Log out of Shoppa?</p>
        <p className="type-caption text-secondary">
          {pending && !online
            ? `${pending} ${pending === 1 ? 'change hasn’t' : 'changes haven’t'} synced yet and will be lost if you log out now. Connect to the internet first to keep ${pending === 1 ? 'it' : 'them'}.`
            : 'Your lists are saved to your account. Sign back in any time to see them.'}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2.5">
          <Button variant={pending && !online ? 'danger' : 'primary'} onClick={() => void go()} loading={busy}>
            {pending && !online ? 'Log out anyway' : 'Log out'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
