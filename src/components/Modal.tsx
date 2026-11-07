import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SheetHeader } from './SheetHeader';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * "sheet": bottom sheet under 640px, centred dialog from 640px (PRD section 3
   * breakpoints). "dialog": centred at every width (confirmations, W7).
   */
  variant?: 'sheet' | 'dialog';
  /** Max width from tablet up. */
  size?: 'sm' | 'md';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Sheet and Dialog components, built on the native <dialog> element so focus
 * is trapped, Esc closes and the rest of the page is inert.
 * W9: the browser or Android Back button closes the sheet before leaving the route.
 */
export function Modal({ open, onClose, title, variant = 'sheet', size = 'md', children, footer, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && el.open) {
      el.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  useBackToClose(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => open && onClose()}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, outside the panel)
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'bg-transparent p-0 text-ink backdrop:bg-scrim',
        variant === 'sheet'
          ? 'mx-0 mb-0 mt-auto w-full max-w-full tablet:m-auto tablet:w-[calc(100%-48px)]'
          : 'm-auto w-[calc(100%-32px)]',
        size === 'sm' ? 'tablet:max-w-[400px]' : 'tablet:max-w-[480px]',
        variant === 'dialog' && (size === 'sm' ? 'max-w-[400px]' : 'max-w-[480px]'),
      )}
    >
      <div
        className={cn(
          'flex max-h-[min(90dvh,760px)] flex-col bg-surface shadow-overlay',
          variant === 'sheet' ? 'rounded-t-28 tablet:rounded-28' : 'rounded-28',
          className,
        )}
      >
        {variant === 'sheet' ? (
          <span className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong tablet:hidden" aria-hidden />
        ) : null}
        <SheetHeader title={title} titleId={titleId} onClose={onClose} className="px-5 pb-2 pt-4 tablet:px-6 tablet:pt-6" />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 tablet:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col gap-3 border-t border-line px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 tablet:px-6 tablet:pb-6">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

let modalSeq = 0;

/**
 * W9: opening a sheet adds a history entry on the same URL, so Back closes
 * the sheet instead of leaving the route. Closing it from the UI removes the
 * entry again. React Router's own state is kept on the pushed entry.
 */
function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = `m${++modalSeq}`;
    window.history.pushState({ ...(window.history.state ?? {}), shoppaModal: id }, '');
    let poppedByBack = false;
    const onPop = () => {
      if ((window.history.state as { shoppaModal?: string } | null)?.shoppaModal !== id) {
        poppedByBack = true;
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBack && (window.history.state as { shoppaModal?: string } | null)?.shoppaModal === id) {
        window.history.back();
      }
    };
  }, [open]);
}
