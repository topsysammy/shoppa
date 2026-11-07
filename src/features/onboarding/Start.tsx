import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { keys, local } from '@/lib/storage';
import { Intro } from './Intro';
import { Splash } from './Splash';
import { WelcomeActions } from './WelcomeActions';

const SPLASH_MS = 1400;

/**
 * Route "/" when logged out. PRD section 5: splash and intro slides are shown
 * once per browser; after that visitors land on Welcome (screen 05).
 */
export function Start() {
  const [firstVisit] = useState(() => local.get(keys.onboarded) !== '1');
  const [stage, setStage] = useState<'splash' | 'intro' | 'welcome'>(firstVisit ? 'splash' : 'welcome');

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = window.setTimeout(() => {
      setStage('intro');
      local.set(keys.onboarded, '1');
    }, SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  if (stage === 'splash') return <Splash />;
  if (stage === 'intro') return <Intro />;
  return <Welcome />;
}

/**
 * Screen 05 Welcome. Figma leaves the top of this screen empty; the logo and
 * a one-line reminder of what Shoppa does fill it here (flagged for design).
 */
function Welcome() {
  return (
    <div className="flex min-h-dvh flex-col items-center canvas-gradient">
      <div className="flex w-full max-w-[440px] flex-1 flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <Logo height={52} tile label="" />
          <h1 className="text-[28px] font-bold leading-9 tracking-[-0.56px] text-ink">Shoppa</h1>
          <p className="max-w-[300px] type-body text-secondary">Write your list, share it on WhatsApp, and shop even without data.</p>
        </div>
        <WelcomeActions />
      </div>
    </div>
  );
}
