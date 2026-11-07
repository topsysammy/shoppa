import { lazy, Suspense } from 'react';
import { Logo } from '@/components/Logo';

import { canRenderShaders } from '@/lib/shaderSupport';

const SplashNebula = lazy(() => import('./SplashNebula'));

const showShader = canRenderShaders();

/**
 * Screen 01 Splash: green gradient, Nebula shader (desktop WebGPU only, see
 * shaderSupport.ts), white logo tile and wordmark. Tap to skip.
 */
export function Splash({ onSkip }: { onSkip?: () => void }) {
  return (
    <div
      className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-[22px] overflow-hidden splash-gradient"
      role="img"
      aria-label="Shoppa"
      onClick={onSkip}
    >
      {showShader ? (
        <Suspense fallback={null}>
          <SplashNebula />
        </Suspense>
      ) : null}
      <span className="relative inline-flex size-[75px] items-center justify-center rounded-[21.875px] bg-white">
        <Logo height={43.75} label="" />
      </span>
      <span className="relative text-[30px] font-bold leading-9 tracking-[-0.6px] text-white">Shoppa</span>
    </div>
  );
}
