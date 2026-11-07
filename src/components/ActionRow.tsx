import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';

type ActionRowProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  description?: string;
  tone?: 'default' | 'danger';
  /** Card style from screen 16 (bordered, chevron, coloured icon circle). */
  variant?: 'plain' | 'card';
  iconBg?: string;
};

/** Option rows in List options (23), Item actions (26) and the + Add menu (16). */
export function ActionRow({ icon, label, description, tone = 'default', variant = 'plain', iconBg, className, type = 'button', ...rest }: ActionRowProps) {
  const danger = tone === 'danger';
  return (
    <button
      type={type}
      className={cn(
        'focus-ring flex w-full items-center gap-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'card' ? 'rounded-18 border border-line bg-surface p-3.5 hover:bg-muted' : 'min-h-[52px] rounded-12 hover:bg-muted',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full',
          variant === 'card' ? 'size-[46px]' : 'size-10',
          iconBg ?? (danger ? 'bg-danger-tint text-danger' : 'bg-muted text-ink'),
        )}
      >
        <Icon name={icon} size={variant === 'card' ? 22 : 18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn(variant === 'card' ? 'type-body-strong' : 'type-body-medium', danger ? 'text-danger' : 'text-ink')}>{label}</span>
        {description ? <span className="truncate type-caption text-secondary">{description}</span> : null}
      </span>
      {variant === 'card' ? <Icon name="chevron-right" size={18} className="shrink-0 text-tertiary" /> : null}
    </button>
  );
}
