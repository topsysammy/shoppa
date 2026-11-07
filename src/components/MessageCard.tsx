import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons/Icon';

type MessageCardProps = {
  title: string;
  body: string;
  icon?: IconName;
  time?: string;
  /** Optional trailing action (e.g. Try again on the sync banner). */
  action?: ReactNode;
  className?: string;
};

/**
 * Figma "Message Card" (114:205): highlight card for latest activity, the
 * offline notice and invites. Secondary text is white rather than Figma's
 * #C7C7CC, which fails contrast on the green surface.
 */
export function MessageCard({ title, body, icon = 'plus', time, action, className }: MessageCardProps) {
  return (
    <div className={cn('flex w-full items-center gap-3 rounded-18 bg-brand-strong px-4 py-3.5 text-on-brand', className)}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow text-on-yellow">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold leading-[22px]">{title}</span>
        <span className="type-caption">{body}</span>
      </span>
      {time ? <span className="shrink-0 type-small">{time}</span> : null}
      {action}
    </div>
  );
}
