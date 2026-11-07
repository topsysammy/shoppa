import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/lib/useMedia';
import { ProfileMenu } from './ProfilePage';

/**
 * Settings page frame: Top Bar with back, optional intro line, white panel.
 * PRD section 5 desktop: settings list on the left, the page on the right.
 */
export function SettingsScaffold({
  title,
  intro,
  back = '/profile',
  children,
  className,
}: {
  title: string;
  intro?: ReactNode;
  back?: string;
  children: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const page = (
    <div className="flex min-h-[calc(100dvh-96px)] min-w-0 flex-1 flex-col desktop:min-h-dvh">
      <TopBar title={title} left={desktop ? undefined : { icon: 'back', label: 'Back', onClick: () => navigate(back) }} className="desktop:pt-6" />
      {intro ? <p className="px-8 pt-2 text-center type-caption text-secondary">{intro}</p> : null}
      <section className={cn('mt-[18px] flex flex-1 flex-col gap-3 rounded-t-32 bg-surface px-5 pb-8 pt-5 desktop:mx-6 desktop:mb-6 desktop:rounded-32', className)}>
        {children}
      </section>
    </div>
  );
  if (!desktop) return page;
  return (
    <div className="flex min-h-dvh">
      <div className="w-[380px] shrink-0 overflow-y-auto border-r border-line">
        <ProfileMenu />
      </div>
      <div className="mx-auto w-full max-w-[720px]">{page}</div>
    </div>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-1 pt-1 type-label text-secondary">{children}</h2>;
}

export function Group({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-20 border border-line">{children}</div>;
}
