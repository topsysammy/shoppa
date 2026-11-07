import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons/Icon';

/** Empty states from screens 17, 19 and 22. */
export function EmptyState({
  icon,
  illustration,
  title,
  body,
  children,
}: {
  icon?: IconName;
  illustration?: boolean;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      {illustration ? (
        <span className="relative mb-1 h-[120px] w-[150px]" aria-hidden>
          <span className="absolute left-[15px] top-0 size-[120px] rounded-full bg-muted" />
          <span className="absolute left-[38px] top-[18px] flex h-[86px] w-[74px] flex-col gap-2 rounded-[14px] border border-line-strong bg-surface px-3 py-3.5">
            <span className="h-[7px] w-[50px] rounded-[4px] bg-line-strong" />
            <span className="h-[7px] w-[35px] rounded-[4px] bg-line-strong" />
            <span className="h-[7px] w-[22.5px] rounded-[4px] bg-line-strong" />
          </span>
          <span className="absolute left-[98px] top-[74px] inline-flex size-10 items-center justify-center rounded-full bg-brand-strong text-white">
            <Icon name="plus" size={20} strokeWidth={2.2} />
          </span>
        </span>
      ) : icon ? (
        <span className="mb-1 inline-flex size-24 items-center justify-center rounded-full bg-muted text-ink" aria-hidden>
          <Icon name={icon} size={32} />
        </span>
      ) : null}
      <h2 className="type-title text-ink">{title}</h2>
      <p className="max-w-[310px] type-body text-secondary">{body}</p>
      <div className="mt-1 flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}
