import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SheetHeader } from './SheetHeader';

type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** In the gallery the panel renders in flow instead of beside the list. */
  inline?: boolean;
  className?: string;
};

/**
 * W6 Side panel: desktop item details and edit, shown beside the list (not
 * modal, so the list stays usable). Esc closes and focus moves into the
 * panel when it opens.
 */
export function SidePanel({ open, onClose, title, children, footer, inline, className }: SidePanelProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    if (!inline) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, inline]);

  if (!open) return null;
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={cn(
        'flex w-[400px] shrink-0 flex-col border-l border-line bg-surface focus:outline-none',
        inline ? 'h-[520px] rounded-20 border' : 'h-full',
        className,
      )}
    >
      <SheetHeader title={title} titleId={titleId} onClose={onClose} closeLabel="Close panel" className="px-6 pb-3 pt-6" />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      {footer ? <div className="flex flex-col gap-3 border-t border-line p-6">{footer}</div> : null}
    </aside>
  );
}
