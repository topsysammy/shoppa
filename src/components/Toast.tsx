import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';

type ToastProps = {
  message: string;
  /** e.g. "Undo", or "Reload" for the Update available toast (W4). */
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  className?: string;
};

/**
 * Figma "Toast" (114:197): snackbar with a single action.
 * Figma draws the action in green on a green surface (fails contrast), so the
 * action uses the on-brand text colour in bold.
 */
export function Toast({ message, actionLabel, onAction, icon = 'check', className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-[54px] w-full max-w-[358px] items-center gap-3 rounded-16 bg-brand-strong py-1 pl-3.5 pr-1.5 text-on-brand shadow-overlay',
        className,
      )}
    >
      <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-brand">
        <Icon name={icon} size={16} strokeWidth={2.4} />
      </span>
      <p className="min-w-0 flex-1 type-body-medium">{message}</p>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="focus-ring min-h-11 shrink-0 rounded-12 px-3.5 text-[16px] font-bold leading-[22px] hover:bg-white/10"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
