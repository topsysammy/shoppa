import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Leading icon (Figma "Icon" slot, 20px). */
  icon?: IconName;
  /** Full width is the Figma default (350px in a 390px frame). */
  fullWidth?: boolean;
  /** Compact 44px height for headers and desktop toolbars. */
  size?: 'lg' | 'md';
  loading?: boolean;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-strong text-on-brand hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-muted active:bg-selected',
  danger: 'bg-danger text-on-brand hover:brightness-110 active:brightness-95',
};

/** Figma "Button" (111:18): one obvious action per screen. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', icon, fullWidth = true, size = 'lg', loading = false, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-16 px-5 type-body-strong transition-[filter,background-color] select-none',
        size === 'lg' ? 'h-[54px]' : 'h-11',
        fullWidth ? 'w-full' : 'w-auto',
        variants[variant],
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : icon ? (
        <Icon name={icon} size={20} />
      ) : null}
      <span>{children}</span>
    </button>
  );
});
