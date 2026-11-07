import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import type { IconName } from './icons/Icon';

type Action = { icon: IconName; label: string; onClick: () => void; dot?: boolean };

type TopBarProps = {
  title: string;
  subtitle?: ReactNode;
  left?: Action;
  right?: Action;
  /** Extra right-side actions (desktop list header). */
  children?: ReactNode;
  className?: string;
};

/**
 * Figma "Top Bar" (114:177): round left button, centred title and optional
 * subtitle, optional right action. The 52px top padding in Figma is the iOS
 * status bar; on the web it becomes the safe-area inset plus 12px.
 */
export function TopBar({ title, subtitle, left, right, children, className }: TopBarProps) {
  return (
    <header className={cn('flex items-center gap-3 px-5 pb-2 pt-[max(12px,env(safe-area-inset-top))]', className)}>
      {left ? <IconButton {...left} /> : <span className="size-11 shrink-0" aria-hidden />}
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <h1 className="w-full truncate type-title text-ink">{title}</h1>
        {subtitle ? <p className="w-full truncate text-[12px] leading-4 text-secondary">{subtitle}</p> : null}
      </div>
      {children}
      {right ? <IconButton {...right} /> : children ? null : <span className="size-11 shrink-0" aria-hidden />}
    </header>
  );
}
