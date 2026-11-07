import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center canvas-gradient">
      <Logo height={48} tile label="" />
      <h1 className="type-display text-ink">Page not found</h1>
      <p className="max-w-[320px] type-body text-secondary">This link doesn&rsquo;t go anywhere in Shoppa. Your lists are safe.</p>
      <Link
        to="/home"
        className="focus-ring inline-flex h-[54px] items-center justify-center rounded-16 bg-brand-strong px-6 type-body-strong text-on-brand"
      >
        Go to Home
      </Link>
    </main>
  );
}
