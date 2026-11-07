import { useEffect, useRef, useState, type ReactNode } from 'react';

type VirtualRowsProps<T> = {
  items: T[];
  rowHeight: number;
  render: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string;
  /** Rows above and below the viewport to keep mounted. */
  overscan?: number;
  /** Lists shorter than this render normally (PRD: virtualise beyond 100 rows). */
  threshold?: number;
};

function scrollParent(el: HTMLElement | null): HTMLElement | Window {
  let p = el?.parentElement ?? null;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p;
    p = p.parentElement;
  }
  return window;
}

/**
 * Fixed-height windowing for long lists (PRD section 8: 200-item lists at
 * 60fps, virtualised beyond 100 rows). Works with window scroll or a
 * scrolling pane (desktop two-pane layout).
 */
export function VirtualRows<T>({ items, rowHeight, render, getKey, overscan = 8, threshold = 100 }: VirtualRowsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<[number, number]>([0, Math.min(items.length, 40)]);
  const virtual = items.length > threshold;

  useEffect(() => {
    if (!virtual) return;
    const el = ref.current;
    if (!el) return;
    const parent = scrollParent(el);
    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewTop = parent === window ? 0 : (parent as HTMLElement).getBoundingClientRect().top;
      const viewH = parent === window ? window.innerHeight : (parent as HTMLElement).clientHeight;
      const start = Math.max(0, Math.floor((viewTop - rect.top) / rowHeight) - overscan);
      const end = Math.min(items.length, Math.ceil((viewTop + viewH - rect.top) / rowHeight) + overscan);
      setRange((r) => (r[0] === start && r[1] === end ? r : [start, end]));
    };
    update();
    parent.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      parent.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [virtual, items.length, rowHeight, overscan]);

  if (!virtual) return <>{items.map((it, i) => <div key={getKey(it)}>{render(it, i)}</div>)}</>;

  const [start, end] = range;
  return (
    <div ref={ref} style={{ height: items.length * rowHeight, position: 'relative' }} role="presentation">
      {items.slice(start, end).map((it, i) => (
        <div key={getKey(it)} style={{ position: 'absolute', top: (start + i) * rowHeight, left: 0, right: 0, height: rowHeight }}>
          {render(it, start + i)}
        </div>
      ))}
    </div>
  );
}
