import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarStack, type AvatarTone } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Logo } from '@/components/Logo';
import { formatQuantity } from '@/lib/units';
import { useOnline } from '@/lib/useOnline';
import { session } from '@/lib/storage';
import { useAuth } from '@/features/auth/AuthProvider';
import { acceptInvite, previewInvite, type InvitePreview } from './api';
import { removePendingInvite, savePendingInvite } from './pendingInvites';
import { maybeAskForPush } from '@/features/notifications/PushPrompt';

export const PENDING_JOIN_KEY = 'shoppa.pendingJoin';

/**
 * Screens 40 Join shared list and 41 Invalid invitation (H3).
 * Works in any browser, signed in or not. Logged-out visitors see the
 * preview, sign up or log in, and come straight back here to join.
 */
export function JoinPage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { session: auth, loading } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const autoJoined = useRef(false);

  useEffect(() => {
    if (!online) return;
    previewInvite(token).then(setPreview, (e: Error) => setError(e.message));
  }, [token, online, auth?.user.id]);

  const join = async () => {
    if (!auth) {
      // Come back here after sign-up, verification or log-in, then join.
      session.set(PENDING_JOIN_KEY, token);
      navigate('/signup', { state: { from: `/join/${token}?accept=1` } });
      return;
    }
    setJoining(true);
    setError('');
    try {
      const listId = await acceptInvite(token);
      session.remove(PENDING_JOIN_KEY);
      removePendingInvite(token);
      navigate(`/lists/${listId}`, { replace: true });
      maybeAskForPush('join');
    } catch (e) {
      setError((e as Error).message);
      setJoining(false);
    }
  };

  // Returning from sign-up with ?accept=1: join without another tap.
  useEffect(() => {
    if (autoJoined.current || loading || !auth || params.get('accept') !== '1' || preview?.status !== 'ok') return;
    autoJoined.current = true;
    if (preview.is_member) navigate(`/lists/${preview.list_id}`, { replace: true });
    else void join();
  }, [auth, loading, params, preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const notNow = () => {
    if (preview?.status === 'ok') {
      savePendingInvite({ token, title: preview.title, inviter: preview.inviter?.name ?? 'Someone', itemCount: preview.item_count });
    }
    navigate(auth ? '/shared' : '/', { replace: true });
  };

  if (!online) {
    return (
      <Centered>
        <Icon name="wifi-off" size={32} />
        <h1 className="type-title text-ink">You&rsquo;re offline</h1>
        <p className="type-body text-secondary">Joining a shared list needs a connection. Try again when you&rsquo;re back online.</p>
      </Centered>
    );
  }

  if (error && !preview) {
    return (
      <Centered action={<Button onClick={() => window.location.reload()}>Try again</Button>}>
        <Icon name="alert" size={32} />
        <h1 className="type-title text-ink">Couldn&rsquo;t open this invitation</h1>
        <p className="type-body text-secondary">{error}</p>
      </Centered>
    );
  }

  if (!preview) {
    return (
      <Centered>
        <Logo height={44} tile label="" />
        <p className="type-body text-secondary" role="status">
          Opening invitation…
        </p>
      </Centered>
    );
  }

  if (preview.status !== 'ok') {
    return (
      <Centered action={<Button onClick={() => navigate(auth ? '/home' : '/', { replace: true })}>Go to Home</Button>}>
        <span className="relative inline-flex size-[88px] items-center justify-center rounded-full bg-surface text-ink">
          <Icon name="link" size={32} />
          <span className="absolute right-0 top-0 inline-flex size-6 items-center justify-center rounded-full bg-alert text-white ring-[3px] ring-ground">
            <Icon name="close" size={12} strokeWidth={3.2} />
          </span>
        </span>
        <h1 className="type-title text-ink">This invitation is no longer available.</h1>
        <p className="type-body text-secondary">
          {preview.status === 'expired' ? 'Invite links last 7 days. ' : ''}Ask the list owner to send you a new invitation.
        </p>
      </Centered>
    );
  }

  const more = preview.item_count - preview.items.length;
  return (
    <div className="flex min-h-dvh flex-col items-center canvas-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col gap-2.5 px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col justify-center gap-[22px]">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <Avatar size={72} name={preview.inviter?.name ?? 'Someone'} tone={(preview.inviter?.tone as AvatarTone) ?? 'blue'} className="border-4 border-surface" />
            <p className="type-body text-secondary">
              <strong className="font-semibold text-ink">{preview.inviter?.name?.split(' ')[0] ?? 'Someone'}</strong> invited you to join
            </p>
            <h1 className="type-display text-ink">{preview.title}</h1>
            <p className="flex items-center gap-2.5 type-caption text-secondary">
              <AvatarStack people={preview.members.map((m) => ({ name: m.name, tone: m.tone as AvatarTone }))} />
              {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'} · {preview.item_count} {preview.item_count === 1 ? 'item' : 'items'}
            </p>
          </div>
          {preview.items.length ? (
            <ul className="rounded-20 border border-line bg-surface px-4 py-1" aria-label="Items on this list">
              {preview.items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
                  <span className="type-body-strong text-ink">{i.name}</span>
                  <span className="type-body-medium text-secondary">{formatQuantity(i.quantity, i.unit)}</span>
                </li>
              ))}
              {more > 0 ? <li className="py-3 type-body-medium text-secondary">+ {more} more {more === 1 ? 'item' : 'items'}</li> : null}
            </ul>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-center type-caption text-danger">
            {error}
          </p>
        ) : null}
        {preview.is_member ? (
          <Button onClick={() => navigate(`/lists/${preview.list_id}`, { replace: true })}>Open list</Button>
        ) : (
          <Button onClick={() => void join()} loading={joining}>
            {auth ? 'Join list' : 'Sign up to join'}
          </Button>
        )}
        {!auth ? (
          <button
            type="button"
            onClick={() => {
              session.set(PENDING_JOIN_KEY, token);
              navigate('/login', { state: { from: `/join/${token}?accept=1` } });
            }}
            className="focus-ring mx-auto min-h-11 rounded-12 px-3 type-body-strong text-link"
          >
            I already have an account
          </button>
        ) : null}
        <button type="button" onClick={notNow} className="focus-ring mx-auto min-h-11 rounded-12 px-3 type-body-strong text-ink">
          Not now
        </button>
      </main>
    </div>
  );
}

function Centered({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center canvas-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-ink">{children}</div>
        {action}
      </main>
    </div>
  );
}
