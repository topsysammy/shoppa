import { useEffect, useState } from 'react';
import { MessageCard } from '@/components/MessageCard';
import { IconButton } from '@/components/IconButton';
import { markStorageWarned, shouldWarnStorage } from '@/features/auth/persistStorage';

/**
 * W8: warn once when the browser refused persistent storage and Shoppa is
 * not installed, because Safari may clear site data after 7 days unused.
 */
export function StorageWarning() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(shouldWarnStorage()), 1500);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  const close = () => {
    markStorageWarned();
    setShow(false);
  };
  return (
    <div className="fixed inset-x-0 bottom-[calc(100px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 desktop:bottom-6">
      <MessageCard
        className="max-w-[420px] shadow-overlay"
        icon="shield"
        title="Keep your lists safe"
        body="This browser may clear Shoppa's saved data. Add Shoppa to your home screen to keep it."
        action={<IconButton variant="ghost" icon="close" label="Dismiss" onClick={close} className="text-white hover:bg-white/10 hover:text-white" />}
      />
    </div>
  );
}
