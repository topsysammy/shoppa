import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import bagImg from '@/assets/onboarding/slide-1-bag.webp';
import listImg from '@/assets/onboarding/slide-2-list.webp';
import { WelcomeActions } from './WelcomeActions';

const slides = [
  {
    id: 'welcome',
    img: bagImg,
    imgAlt: 'A paper bag of groceries: herbs, milk, bread and onions',
    title: (
      <>
        <span>Welcome to </span>
        <span className="ml-1 inline-block -rotate-5 rounded-full bg-brand px-4 py-1 text-[30px] leading-[35px] tracking-[-0.42px] text-white">
          Shoppa
        </span>
      </>
    ),
    titleText: 'Welcome to Shoppa',
    body: 'Keep everything you need in one place. Create lists, stay organised, and shop without the stress.',
  },
  {
    id: 'one-list',
    img: listImg,
    imgAlt: 'A handwritten grocery list pinned with a clip',
    title: 'Everything you need. One list.',
    titleText: 'Everything you need. One list.',
    body: 'Quickly add what you need, from everyday groceries to your market essentials.',
  },
] as const;

/**
 * Screen 02 intro slides (two variants in Figma), swipeable with scroll snap.
 * Shown once per browser (PRD section 5), with the A2 Welcome actions below.
 * Tablet and desktop centre the same layout in a 440px column.
 */
export function Intro() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-hidden hero-gradient">
      <div className="flex w-full max-w-[440px] flex-1 flex-col pb-[max(24px,env(safe-area-inset-bottom))]">
        <section aria-roledescription="carousel" aria-label="About Shoppa" className="flex-1">
          <div
            ref={track}
            className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((s, i) => (
              <div
                key={s.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${slides.length}: ${s.titleText}`}
                aria-hidden={index !== i}
                className="flex w-full shrink-0 snap-center flex-col items-center px-5"
              >
                <div className="relative -mx-5 mt-[max(29px,env(safe-area-inset-top))] h-[min(360px,42dvh)] w-[calc(100%+40px)] overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.imgAlt}
                    width={482}
                    height={360}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 object-cover"
                  />
                </div>
                <h1 className="mt-2 max-w-[300px] text-center text-[28px] font-bold leading-[36px] tracking-[-0.56px] text-ink">
                  {s.title}
                </h1>
                <p className="mt-3 max-w-[326px] text-center type-body text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="flex justify-center gap-1.5 py-4" role="tablist" aria-label="Choose slide">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className="focus-ring relative flex h-6 items-center rounded-full before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-['']"
            >
              <span className={cn('block h-1.5 rounded-[3px] transition-[width,background-color]', index === i ? 'w-8 bg-brand-strong' : 'w-1.5 bg-dot-idle')} />
            </button>
          ))}
        </div>
        <div className="px-5">
          <WelcomeActions />
        </div>
      </div>
    </div>
  );
}
