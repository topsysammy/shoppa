import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Icon } from '@/components/icons/Icon';
import { session as sessionStore } from '@/lib/storage';
import haloOuter from '@/assets/auth/halo-outer.svg';
import haloInner from '@/assets/auth/halo-inner.svg';
import { firstName, useAuth } from './AuthProvider';

/**
 * Screen 12 Account created, shown right after sign-up. Email verification
 * (screen 11, PRD A7) was removed at the product owner's request: sign-up
 * signs the user straight in and sends no email.
 */
export function AccountCreated() {
  const navigate = useNavigate();
  const { session, loading, displayName } = useAuth();
  const name = firstName(displayName);

  // H3: signed up from an invite link, so go straight back and join.
  useEffect(() => {
    const token = sessionStore.get('shoppa.pendingJoin');
    if (session && token) navigate(`/join/${token}?accept=1`, { replace: true });
  }, [session, navigate]);

  if (!loading && !session) return <Navigate to="/signup" replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center success-gradient">
      <main className="flex w-full max-w-[440px] flex-1 flex-col gap-2.5 px-5 pb-10 pt-[max(52px,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center" role="status">
          <span className="relative size-[104px]">
            <img src={haloOuter} alt="" width={164} height={164} className="absolute -left-[30px] -top-[30px] max-w-none" />
            <img src={haloInner} alt="" width={132} height={132} className="absolute -left-[14px] -top-[14px] max-w-none" />
            <span className="absolute inset-0 inline-flex items-center justify-center rounded-full bg-brand-strong text-white">
              <Icon name="check" size={50} strokeWidth={1.3} />
            </span>
          </span>
          <h1 className="pt-9 text-[26px] font-semibold leading-8 tracking-[-0.5px] text-ink">
            You&rsquo;re all set{name ? `, ${name}` : ''}
          </h1>
          <p className="max-w-[326px] px-5 type-body text-secondary">
            Your account is ready. Start your first list and add things as you remember them.
          </p>
        </div>
        <Button onClick={() => navigate('/lists/new', { replace: true })}>Create my first list</Button>
        <Button variant="secondary" onClick={() => navigate('/home', { replace: true })}>
          Go to Home
        </Button>
      </main>
    </div>
  );
}
