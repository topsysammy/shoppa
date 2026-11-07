import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { showToast } from '@/features/shell/toasts';
import { closeSheet, openSheet } from '@/features/lists/sheetStore';
import { dismissPrePrompt, enablePush, pushSupport, shouldPrePrompt } from './push';

/** Call after sharing or joining a list (W5). */
export function maybeAskForPush(reason: 'share' | 'join') {
  if (shouldPrePrompt()) window.setTimeout(() => openSheet({ kind: 'pushPrompt', reason }), 600);
}

/**
 * W4 screen / W5 requirement: explain notifications before the browser asks.
 * iPhone users who haven't installed Shoppa are told to add it to the Home
 * Screen first, because iOS only delivers push to installed web apps.
 */
export function PushPrompt({ open, reason }: { open: boolean; reason?: 'share' | 'join' }) {
  const [busy, setBusy] = useState(false);
  const needsInstall = pushSupport() === 'needs-install';
  const later = () => {
    dismissPrePrompt();
    closeSheet();
  };
  const enable = async () => {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    closeSheet();
    if (r === 'granted') showToast({ icon: 'bell', message: 'Notifications are on' });
    else if (r === 'denied') {
      dismissPrePrompt();
      showToast({ icon: 'bell', message: 'Notifications are off. You can still check the inbox in Shoppa.' });
    } else showToast({ icon: 'alert', message: 'Couldn’t turn on notifications. Try again later.' });
  };
  return (
    <Modal open={open} onClose={later} title="Stay in the loop" variant="dialog" size="sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-avatar-mint text-avatar-mint-text">
          <Icon name="bell" size={28} />
        </span>
        <p className="type-body text-body">
          {reason === 'join'
            ? 'Get a notification when people add items or finish shopping this list.'
            : 'Get a notification when people join your list, add items or finish shopping.'}
        </p>
        {needsInstall ? (
          <p className="rounded-16 bg-muted p-3 type-caption text-body">
            On iPhone, notifications work once Shoppa is on your Home Screen: tap <Icon name="share" size={14} className="inline align-[-2px]" title="Share" /> then
            Add to Home Screen. You&rsquo;ll still see everything in the Shoppa inbox.
          </p>
        ) : null}
        <div className="mt-2 flex w-full flex-col gap-2.5">
          {needsInstall ? (
            <Button onClick={later}>Got it</Button>
          ) : (
            <Button icon="bell" onClick={() => void enable()} loading={busy}>
              Turn on notifications
            </Button>
          )}
          {needsInstall ? null : (
            <Button variant="secondary" onClick={later}>
              Not now
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
