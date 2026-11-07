import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { TopBar } from '@/components/TopBar';
import { useOnline } from '@/lib/useOnline';
import { useAuth } from '@/features/auth/AuthProvider';
import { useItems, useList } from '@/features/lists/data';
import { showToast } from '@/features/shell/toasts';
import { getInvite, formatExpiry, inviteUrl, shareMessage, shortInvite, type Invite } from './api';
import { canWebShare, copyText, whatsappUrl } from './ShareSheet';

/** Screen 39 Invite people / Invite link copied. Owner only. */
export function InvitePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { displayName } = useAuth();
  const list = useList(id);
  const items = useItems(id);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!online) return;
    getInvite(id).then(setInvite, (e: Error) => setError(e.message));
  }, [id, online]);

  const url = invite ? inviteUrl(invite.token) : '';
  const message = list ? shareMessage(displayName.split(' ')[0] || 'I', list.title, items?.length ?? 0, url) : '';

  const copy = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    showToast({ icon: ok ? 'check' : 'alert', message: ok ? 'Invite link copied' : 'Couldn’t copy the link' });
  };

  const reset = async () => {
    setCopied(false);
    try {
      setInvite(await getInvite(id, true));
      showToast({ icon: 'refresh', message: 'New invite link created. The old one no longer works.' });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col desktop:mx-auto desktop:min-h-dvh desktop:max-w-[640px]">
      <TopBar title="Invite people" left={{ icon: 'back', label: 'Back', onClick: () => navigate(-1) }} />
      <div className="px-5 pt-6 text-center">
        <h1 className="type-title text-ink">Anyone with this link can join</h1>
        <p className="mt-1 type-caption text-secondary">They&rsquo;ll be able to view, add, edit and check off items on {list?.title ?? 'this list'}.</p>
      </div>
      <section className="mt-6 flex flex-1 flex-col gap-3.5 rounded-t-32 bg-surface px-5 pb-8 pt-[22px] desktop:rounded-32">
        {!online ? (
          <p className="flex items-center gap-2 rounded-16 bg-muted p-4 type-body text-body">
            <Icon name="wifi-off" size={18} /> Connect to the internet to create an invite link.
          </p>
        ) : error ? (
          <p role="alert" className="rounded-16 bg-danger-tint p-4 type-body text-danger">
            {error}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-16 bg-muted py-1.5 pl-4 pr-1.5">
              <Icon name="link" size={18} className="shrink-0 text-ink" />
              <span className="min-w-0 flex-1 truncate type-body-strong text-ink" aria-label="Invite link">
                {invite ? shortInvite(invite.token) : 'Creating link…'}
              </span>
              <button
                type="button"
                disabled={!invite}
                onClick={() => void copy()}
                className="focus-ring inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand-strong px-4 type-label text-on-brand disabled:opacity-50"
              >
                {copied ? <Icon name="check" size={14} strokeWidth={3} /> : null}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {invite ? (
              <p className="flex items-center gap-1.5 type-caption text-secondary">
                <Icon name="clock" size={14} /> Expires {formatExpiry(invite.expiresAt)} ·{' '}
                <button type="button" onClick={() => void reset()} className="focus-ring rounded-[4px] font-semibold text-link">
                  Reset link
                </button>
              </p>
            ) : null}
            <Button icon="whatsapp" disabled={!invite} onClick={() => window.open(whatsappUrl(message), '_blank', 'noopener')}>
              Send on WhatsApp
            </Button>
            <Button
              variant="secondary"
              disabled={!invite}
              onClick={() =>
                canWebShare()
                  ? void navigator.share({ title: list?.title, text: message, url }).catch(() => undefined)
                  : (window.location.href = `mailto:?subject=${encodeURIComponent(`Join my Shoppa list: ${list?.title ?? ''}`)}&body=${encodeURIComponent(message)}`)
              }
            >
              {canWebShare() ? 'Other ways to share' : 'Send by email'}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
