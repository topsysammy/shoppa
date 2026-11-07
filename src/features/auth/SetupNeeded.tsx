import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

/** Shown in development when .env.local is missing the Supabase URL or anon key. */
export function SetupNeeded() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center canvas-gradient">
      <Logo height={44} tile label="" />
      <h1 className="type-title text-ink">Connect Shoppa to Supabase</h1>
      <p className="max-w-[360px] type-body text-secondary">
        Copy <code className="rounded-[6px] bg-muted px-1.5">.env.example</code> to{' '}
        <code className="rounded-[6px] bg-muted px-1.5">.env.local</code>, add your project URL and anon key, then restart{' '}
        <code className="rounded-[6px] bg-muted px-1.5">npm run dev</code>. Setup steps are in supabase/README.md.
      </p>
      <Link to="/dev/components" className="focus-ring rounded-12 px-2 py-2 type-body-strong text-link">
        Open the component gallery
      </Link>
    </main>
  );
}
