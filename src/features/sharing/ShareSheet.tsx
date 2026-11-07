import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/lib/useMedia';
import { useOnline } from '@/lib/useOnline';
import { useAuth } from '@/features/auth/AuthProvider';
import { useItems, useList } from '@/features/lists/data';
import { closeSheet } from '@/features/lists/sheetStore';
import { showToast } from '@/features/shell/toasts';
import { currentUserId } from '@/sync/currentUser';
import { db } from '@/db/schema';
import { useLiveQuery } from '@/db/useLiveQuery';
import { getInvite, inviteUrl, shareMessage, shortInvite, type Invite } from './api';
import { personOf, shortName, usePeople } from './people';
import { maybeAskForPush } from '@/features/notifications/PushPrompt';

export const canWebShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Opens WhatsApp with the message (H1: wa.me link with the pre-filled text). */
export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Screen 38 Share list (H1). WhatsApp via wa.me, Messages and Email via
 * sms:/mailto:, Copy link, and the Web Share sheet ("More") on mobile.
 * Desktop shows WhatsApp, Email and Copy link (PRD section 3).
 */
export function ShareSheet({ listId }: { listId?: string }) {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const online = useOnline();
  const { displayName } = useAuth();
  const list = useList(listId);
  const items = useItems(listId);
  const members = useLiveQuery(async () => (listId ? db.members.where('listId').equals(listId).toArray() : []), [listId]) ?? [];
  const people = usePeople();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');
  const isOwner = list?.ownerId === currentUserId();

  useEffect(() => {
    setInvite(null);
    setError('');
    if (!listId || !isOwner || !online) return;
    getInvite(listId).then(setInvite, (e: Error) => setError(e.message));
  }, [listId, isOwner, online]);

  const me = personOf(people, currentUserId());
  const sender = (me.name !== 'A member' ? me.name : displayName).split(/\s+/)[0] || 'I';
  const url = invite ? inviteUrl(invite.token) : '';
  const count = items?.length ?? 0;
  const message = list ? shareMessage(sender, list.title, count, url || shortInvite('…')) : '';
  const others = members.filter((m) => m.userId !== currentUserId()).length;

  const targets: Array<{ id: string; label: string; icon: IconName; primary?: boolean; show: boolean; run: () => void }> = [
    { id: 'wa', label: 'WhatsApp', icon: 'whatsapp', primary: true, show: true, run: () => window.open(whatsappUrl(message), '_blank', 'noopener') },
    { id: 'sms', label: 'Messages', icon: 'comment', show: !desktop, run: () => (window.location.href = `sms:?&body=${encodeURIComponent(message)}`) },
    {
      id: 'mail',
      label: 'Email',
      icon: 'mail',
      show: true,
      run: () => (window.location.href = `mailto:?subject=${encodeURIComponent(`Join my Shoppa list: ${list?.title ?? ''}`)}&body=${encodeURIComponent(message)}`),
    },
    {
      id: 'copy',
      label: 'Copy link',
      icon: 'link',
      show: true,
      run: async () => {
        const ok = await copyText(url);
        showToast({ icon: ok ? 'check' : 'alert', message: ok ? 'Invite link copied' : 'Couldn’t copy. Press and hold the link to copy it.' });
      },
    },
    {
      id: 'more',
      label: 'More',
      icon: 'more',
      show: !desktop && canWebShare(),
      run: () => void navigator.share({ title: list?.title, text: message, url }).catch(() => undefined),
    },
  ];

  return (
    <Modal open={Boolean(listId)} onClose={closeSheet} title="Share list">
      {list ? (
        <div className="flex flex-col gap-[18px]">
          <p className="-mt-1 type-caption text-secondary">People you invite can view, add, edit and check off items.</p>
          {!isOwner ? (
            <p className="rounded-16 bg-muted p-4 type-body text-body">Only the list owner can invite people. Ask them to share the link with you.</p>
          ) : !online ? (
            <p className="flex items-center gap-2 rounded-16 bg-muted p-4 type-body text-body">
              <Icon name="wifi-off" size={18} /> Connect to the internet to create an invite link.
            </p>
          ) : error ? (
            <p role="alert" className="rounded-16 bg-danger-tint p-4 type-body text-danger">
              {error}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 rounded-18 bg-brand-strong px-4 py-3.5 text-on-brand" aria-live="polite">
                <span className="type-small">Message preview</span>
                <p className="type-caption">
                  {sender} shared <strong className="font-semibold">{list.title}</strong> ({count} {count === 1 ? 'item' : 'items'}) with you. Open it on Shoppa:{' '}
                  {invite ? shortInvite(invite.token) : 'creating link…'}
                </p>
              </div>
              <ul className="flex gap-1">
                {targets
                  .filter((t) => t.show)
                  .map((t) => (
                    <li key={t.id} className="flex flex-1 justify-center">
                      <button
                        type="button"
                        disabled={!invite}
                        onClick={() => {
                          void t.run();
                          // W5: offer notifications right after sharing.
                          maybeAskForPush('share');
                        }}
                        className="focus-ring flex flex-col items-center gap-2 rounded-16 p-1 disabled:opacity-50"
                      >
                        <span
                          className={cn(
                            'inline-flex size-[54px] items-center justify-center rounded-full border',
                            t.primary ? 'border-brand bg-brand-strong text-white' : 'border-line bg-surface text-ink',
                          )}
                        >
                          <Icon name={t.icon} size={t.primary ? 24 : 22} />
                        </span>
                        <span className="type-small text-ink">{t.label}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              closeSheet();
              navigate(`/lists/${list.id}/members`);
            }}
            className="focus-ring flex items-center gap-3.5 rounded-18 border border-line px-4 py-3.5 text-left hover:bg-muted"
          >
            <AvatarStack people={members.map((m) => personOf(people, m.userId))} />
            <span className="flex-1 type-body-medium text-ink">{isOwner ? 'Manage members' : 'Members'}</span>
            <span className="type-caption text-secondary">{others === 0 ? 'Only you' : `${members.length} people`}</span>
            <Icon name="chevron-right" size={18} className="text-tertiary" />
          </button>
          <p className="type-small text-secondary">Invite links expire after 7 days.</p>
          {desktop ? null : (
            <Button variant="secondary" onClick={closeSheet}>
              Done
            </Button>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export { shortName };
