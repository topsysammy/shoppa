import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';

export type IconButtonVariant = 'outline' | 'close' | 'ghost' | 'fab';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName;
  /** Required: becomes aria-label and the hover tooltip. */
  label: string;
  variant?: IconButtonVariant;
  /** Optional unread dot (e.g. bell). */
  dot?: boolean;
};

const variantClass: Record<IconButtonVariant, string> = {
  // Figma "Icon Button" (111:19): round 44px, surface, strong border, 20px icon
  outline: 'size-11 bg-surface border border-line-strong text-ink hover:bg-muted',
  // Sheet Header close (114:193): 40px visual ring inside a 44px target
  close:
    'size-11 text-ink before:absolute before:inset-0.5 before:rounded-full before:border-[1.5px] before:border-line-focus hover:before:bg-muted before:-z-0',
  // Hover actions on desktop rows and inline actions
  ghost: 'size-11 text-secondary hover:bg-muted hover:text-ink',
  // Nav Bar centre + (114:76): 54px brand fill with FAB shadow
  fab: 'size-[54px] bg-brand text-white shadow-fab hover:brightness-110 active:brightness-95',
};

const iconSize: Record<IconButtonVariant, number> = { outline: 20, close: 18, ghost: 20, fab: 24 };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'outline', dot, className, type = 'button', title, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'focus-ring relative isolate inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      <span className="relative z-10 inline-flex">
        <Icon name={icon} size={iconSize[variant]} strokeWidth={variant === 'fab' ? 2.2 : undefined} />
      </span>
      {dot ? (
        <span className="absolute right-2.5 top-2.5 z-10 size-2 rounded-full bg-alert ring-2 ring-surface" aria-hidden />
      ) : null}
    </button>
  );
});
