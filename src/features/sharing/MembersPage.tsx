import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { TopBar } from '@/components/TopBar';
import { db, type MemberRow } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useOnline } from '@/lib/useOnline';
import { useList } from '@/features/lists/data';
import { EmptyState } from '@/features/lists/EmptyState';
import { showToast } from '@/features/shell/toasts';
import { useAuth } from '@/features/auth/AuthProvider';
import { currentUserId } from '@/sync/currentUser';
import { activeInvite, formatExpiry, leaveList, removeMember, revokeInvites, shortInvite, type Invite } from './api';
import { personOf, usePeople, type Person } from './people';

const joined = (iso: string) => `Joined ${new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`;

/** Screens 46 Members (owner) and 47 Remove member; members see Leave list instead. */
export function MembersPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { user } = useAuth();
  const list = useList(id);
  const members = useLiveQuery(() => db.members.where('listId').equals(id).toArray(), [id]);
  const people = usePeople();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [removing, setRemoving] = useState<{ member: MemberRow; person: Person } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOwner = list?.ownerId === currentUserId();

  useEffect(() => {
    if (!isOwner || !online) return;
    activeInvite(id).then(setInvite, () => setInvite(null));
  }, [id, isOwner, online]);

  if (list === undefined || members === undefined) return <div className="min-h-dvh" aria-busy="true" />;
  if (!list) {
    return (
      <EmptyState icon="users" title="This list isn’t available" body="It may have been deleted, or you no longer have access to it.">
        <Button fullWidth={false} onClick={() => navigate('/shared')}>
          Go to Shared
        </Button>
      </EmptyState>
    );
  }

  const sorted = [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.joinedAt < b.joinedAt ? -1 : 1));

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await removeMember(id, removing.member.userId);
      showToast({ icon: 'check', message: `${removing.person.name} removed` });
      setRemoving(null);
    } catch (e) {
      showToast({ icon: 'alert', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    try {
      await revokeInvites(id);
      setInvite(null);
      showToast({ icon: 'link', message: 'Invite link disabled' });
    } catch (e) {
      showToast({ icon: 'alert', message: (e as Error).message });
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await leaveList(id);
      showToast({ icon: 'logout', message: `You left ${list.title}` });
      navigate('/shared', { replace: true });
    } catch (e) {
      showToast({ icon: 'alert', message: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:max-w-[640px]">
      <TopBar title="Members" subtitle={list.title} left={{ icon: 'back', label: 'Back', onClick: () => navigate(`/lists/${id}`) }} />
      <section className="mt-[18px] flex flex-1 flex-col gap-3.5 rounded-t-32 bg-surface px-5 pb-8 pt-[22px] desktop:rounded-32">
        <h2 className="type-body-strong text-ink">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </h2>
        <ul className="overflow-hidden rounded-20 border border-line">
          {sorted.map((m) => {
            const p = personOf(people, m.userId);
            const owner = m.role === 'owner';
            return (
              <li key={m.key} className="flex items-center gap-3.5 border-b border-line px-4 py-3 last:border-b-0">
                <Avatar size={44} name={p.name} tone={p.tone} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate type-body-strong text-ink">
                    {p.name}
                    {p.isMe ? ' (you)' : ''}
                  </span>
                  <span className="truncate type-caption text-secondary">{p.isMe ? user?.email : joined(m.joinedAt)}</span>
                </div>
                {owner ? <Badge label="Owner" tone="dark" /> : <Badge label="Member" tone="neutral" />}
                {isOwner && !owner ? (
                  <IconButton
                    icon="close"
                    label={`Remove ${p.name}`}
                    className="size-10 border-line-strong text-danger"
                    disabled={!online}
                    onClick={() => setRemoving({ member: m, person: p })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="rounded-16 bg-muted p-4">
          <p className="type-label text-ink">What members can do</p>
          <p className="mt-1 type-caption text-secondary">
            View, add, edit and check off items. Only {isOwner ? 'you' : 'the owner'} can rename or delete the list and manage members.
          </p>
        </div>

        {isOwner ? (
          <>
            <h2 className="pt-1 type-body-strong text-ink">Active invite link</h2>
            {!online ? (
              <p className="type-caption text-secondary">Connect to the internet to see the invite link.</p>
            ) : invite === undefined ? null : invite ? (
              <div className="flex items-center gap-3 rounded-20 border border-line px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate type-label text-ink">{shortInvite(invite.token)}</span>
                  <span className="type-caption text-secondary">Expires {formatExpiry(invite.expiresAt)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void disable()}
                  className="focus-ring min-h-11 rounded-full border border-danger/30 px-4 type-label text-danger hover:bg-danger-tint"
                >
                  Disable
                </button>
              </div>
            ) : (
              <p className="type-caption text-secondary">No active link. Invite people to create one.</p>
            )}
            <div className="mt-auto pt-6">
              <Button icon="plus" onClick={() => navigate(`/lists/${id}/invite`)} disabled={!online}>
                Invite people
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-auto pt-6">
            <Button variant="danger" icon="logout" onClick={() => setLeaving(true)} disabled={!online}>
              Leave list
            </Button>
          </div>
        )}
        {!online ? (
          <p className="flex items-center gap-2 type-caption text-secondary">
            <Icon name="wifi-off" size={16} /> Member changes need a connection.
          </p>
        ) : null}
      </section>

      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} variant="dialog" size="sm" title="Remove member">
        {removing ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar size={44} name={removing.person.name} tone={removing.person.tone} />
            <p className="type-title text-ink">
              Remove {removing.person.name.split(' ')[0]} from {list.title}?
            </p>
            <p className="type-caption text-secondary">They won&rsquo;t be able to see or edit this list anymore. Items they added will stay.</p>
            <div className="mt-2 flex w-full flex-col gap-2.5">
              <Button variant="danger" onClick={() => void remove()} loading={busy}>
                Remove
              </Button>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={leaving} onClose={() => setLeaving(false)} variant="dialog" size="sm" title="Leave list">
        <div className="flex flex-col gap-4">
          <p className="type-body text-body">You won&rsquo;t see {list.title} anymore. The owner can invite you again.</p>
          <div className="flex flex-col gap-2.5">
            <Button variant="danger" onClick={() => void leave()} loading={busy}>
              Leave list
            </Button>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
