import { lazy, Suspense } from 'react';
import bannerImg from '@/assets/home/banner-groceries.webp';

const BannerCaustic = lazy(() => import('./BannerCaustic'));
const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

/**
 * Screen 13 banner: green Message Card with the Figma "Water caustic"
 * shader (WebGPU browsers) and the groceries illustration.
 * Body text is white instead of Figma's #EAEAEA for contrast on green.
 */
export function HomeBanner({ onStart }: { onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="focus-ring relative isolate flex h-[98px] w-full items-center overflow-hidden rounded-18 bg-brand-strong px-4 py-3.5 text-left"
    >
      {hasWebGPU ? (
        <Suspense fallback={null}>
          <BannerCaustic />
        </Suspense>
      ) : null}
      <span className="relative z-10 flex w-[193px] flex-col gap-0.5 text-white">
        <span className="text-[15px] font-semibold leading-[22px]">Ready for your next shop?</span>
        <span className="type-caption">Build your list in seconds and tick things off as you shop</span>
      </span>
      <img
        src={bannerImg}
        alt=""
        width={178}
        height={97}
        className="pointer-events-none absolute right-[-10px] top-1/2 z-10 h-[97px] w-[178px] max-w-none -translate-y-1/2 object-cover"
      />
    </button>
  );
}
