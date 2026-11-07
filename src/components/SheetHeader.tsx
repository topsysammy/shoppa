import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

type SheetHeaderProps = {
  title: string;
  onClose?: () => void;
  /** id for aria-labelledby on the surrounding dialog */
  titleId?: string;
  closeLabel?: string;
  className?: string;
};

/** Figma "Sheet Header" (114:191): sheet / modal title with an outlined round close button. */
export function SheetHeader({ title, onClose, titleId, closeLabel = 'Close', className }: SheetHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 id={titleId} className="type-title text-ink">
        {title}
      </h2>
      {onClose ? <IconButton variant="close" icon="close" label={closeLabel} onClick={onClose} className="-mr-0.5" /> : null}
    </div>
  );
}
