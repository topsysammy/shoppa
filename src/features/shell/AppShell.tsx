import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavBar, type NavTab } from '@/components/NavBar';
import { Sidebar } from '@/components/Sidebar';
import { openSheet } from '@/features/lists/sheetStore';
import { SyncBanner } from './SyncBanner';
import { StorageWarning } from './StorageWarning';
import { ToastHost } from './ToastHost';
import { useShortcuts } from './useShortcuts';
import { useUnreadCount } from '@/features/notifications/data';
import { useMyProfile } from '@/features/lists/data';
import { applyTheme } from '@/lib/theme';
import { local } from '@/lib/storage';

// Sheets load after first paint; they are only needed once the user taps something.
const Sheets = lazy(() => import('@/features/lists/Sheets').then((m) => ({ default: m.Sheets })));

function tabFromPath(path: string): NavTab | 'notifications' | 'search' | null {
  const seg = path.split('/')[1];
  if (seg === 'home' || seg === 'lists' || seg === 'shared' || seg === 'profile') return seg;
  if (seg === 'settings') return 'profile';
  if (seg === 'notifications' || seg === 'search') return seg;
  return null;
}

/**
 * Responsive app shell (PRD section 3 breakpoints, W6):
 * - phone (<640px): full-width content, bottom Nav Bar with centre +
 * - tablet (640-1023px): bottom Nav Bar kept, content centred at 640px max
 * - desktop (1024px+): left Sidebar, content area for the two panes
 */
export function AppShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = tabFromPath(pathname);
  useShortcuts();
  const unread = useUnreadCount();
  // Appearance syncs across devices: a device with no theme of its own follows the profile.
  const profile = useMyProfile();
  useEffect(() => {
    if (profile?.theme && profile.theme !== 'system' && !local.get('shoppa.theme')) applyTheme(profile.theme);
  }, [profile?.theme]);

  return (
    <div className="flex min-h-dvh canvas-gradient">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-12 focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      {!bare ? (
        <div className="hidden desktop:block">
          <Sidebar active={active} unread={unread} onNewList={() => openSheet({ kind: 'createList' })} onSearch={() => navigate('/search')} />
        </div>
      ) : null}
      <main
        id="main"
        className={
          bare
            ? 'w-full'
            : 'mx-auto w-full max-w-[640px] pb-[calc(96px+env(safe-area-inset-bottom))] desktop:max-w-none desktop:pb-0'
        }
      >
        <SyncBanner />
        {children}
      </main>
      {!bare ? (
        <div className="desktop:hidden">
          <NavBar
            active={active === 'home' || active === 'lists' || active === 'shared' || active === 'profile' ? active : 'home'}
            onAdd={() => openSheet({ kind: 'addMenu' })}
          />
        </div>
      ) : null}
      <Suspense fallback={null}>
        <Sheets />
      </Suspense>
      <ToastHost />
      <StorageWarning />
    </div>
  );
}
