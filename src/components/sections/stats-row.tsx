'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type StatItem = {
  value: string;
  label: string;
  description?: string;
};

type StatsRowProps = {
  title?: string;
  items: StatItem[];
  className?: string;
};

type ParsedCounter = {
  kind: 'single';
  prefix: string;
  target: number;
  suffix: string;
  locale: 'en-US' | 'de-DE';
};

type ParsedRangeCounter = {
  kind: 'range';
  start: number;
  end: number;
  suffix: string;
};

type ParsedCounterValue = ParsedCounter | ParsedRangeCounter;

function parseCounterValue(value: string): ParsedCounterValue | null {
  const trimmed = value.trim();
  const rangeMatch = trimmed.match(/^([0-9][0-9,.]*)[-–]([0-9][0-9,.]*)(\+?)$/);
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1].replace(/[,.]/g, ''), 10);
    const end = Number.parseInt(rangeMatch[2].replace(/[,.]/g, ''), 10);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return {
        kind: 'range',
        start,
        end,
        suffix: rangeMatch[3] || '',
      };
    }
  }

  const match = trimmed.match(/^([^0-9]*)([0-9][0-9,.]*)(\+?)$/);
  if (!match) {
    return null;
  }

  const numberText = match[2];
  const target = Number.parseInt(numberText.replace(/[,.]/g, ''), 10);
  if (!Number.isFinite(target)) {
    return null;
  }

  const hasGroupingSeparator = /[,.]/.test(numberText);
  const hasCounterIntent = Boolean(match[3]) || hasGroupingSeparator || target >= 10000;
  if (!hasCounterIntent) {
    return null;
  }

  return {
    kind: 'single',
    prefix: match[1] || '',
    target,
    suffix: match[3] || '',
    locale: numberText.includes('.') && !numberText.includes(',') ? 'de-DE' : 'en-US',
  };
}

function useInViewOnce() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function useAnimatedCount(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (reduceMotion) {
      return;
    }

    const durationMs = 1300;
    const start = performance.now();

    let frame = 0;
    const tick = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion, active]);

  return reduceMotion ? target : value;
}

function CounterValue({ value, active }: { value: string; active: boolean }) {
  const parsed = useMemo(() => parseCounterValue(value), [value]);
  const animated = useAnimatedCount(parsed?.kind === 'single' ? parsed.target : 0, Boolean(parsed && parsed.kind === 'single' && active));
  const animatedStart = useAnimatedCount(parsed?.kind === 'range' ? parsed.start : 0, Boolean(parsed && parsed.kind === 'range' && active));
  const animatedEnd = useAnimatedCount(parsed?.kind === 'range' ? parsed.end : 0, Boolean(parsed && parsed.kind === 'range' && active));

  if (!parsed) {
    return <span>{value}</span>;
  }

  if (parsed.kind === 'range') {
    return (
      <span>
        {animatedStart}-{animatedEnd}
        {parsed.suffix}
      </span>
    );
  }

  return (
    <span>
      {parsed.prefix}
      {new Intl.NumberFormat(parsed.locale).format(animated)}
      {parsed.suffix}
    </span>
  );
}

export function StatsRow({ title, items, className }: StatsRowProps) {
  const { ref, inView } = useInViewOnce();

  if (items.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className={cn('relative overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] text-white shadow-[var(--shadow-modal)]', className)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--casa-blue)_0%,var(--casa-blue)_34%,var(--casa-sun)_34%,var(--casa-sun)_68%,var(--casa-red)_68%,var(--casa-red)_100%)]" aria-hidden="true" />
      <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute -bottom-28 left-10 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />

      <div className="relative px-5 py-6 md:px-7 md:py-7">
        {title ? <h2 className="max-w-2xl text-2xl font-bold leading-tight text-white md:text-3xl">{title}</h2> : null}
      </div>

      <ul
        className={cn(
          'relative grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4',
          title ? '' : 'border-t-0'
        )}
      >
        {items.map((item, index) => (
          <li
            key={`${item.value}-${item.label}`}
            className={cn(
              'group relative min-h-[8rem] border-white/10 px-5 py-5 transition-colors duration-200 hover:bg-white/[0.06]',
              index > 0 && 'border-t',
              index % 2 === 1 && 'sm:border-l',
              index > 1 && 'sm:border-t',
              index < 2 && 'sm:border-t-0',
              index > 0 && 'xl:border-l',
              'xl:border-t-0'
            )}
          >
            <span
              className={cn(
                'mb-4 block h-1 w-10 rounded-full transition-[width] duration-200 group-hover:w-16',
                index % 4 === 0 && 'bg-[var(--casa-blue)]',
                index % 4 === 1 && 'bg-[var(--casa-sun)]',
                index % 4 === 2 && 'bg-[var(--casa-red)]',
                index % 4 === 3 && 'bg-white'
              )}
              aria-hidden="true"
            />
            <p className="tabular-nums text-[2.25rem] font-black leading-none text-white sm:text-[2.7rem]">
              <CounterValue value={item.value} active={inView} />
            </p>
            <p className="mt-3 max-w-[15rem] text-sm font-bold uppercase leading-snug tracking-[0.08em] text-white/68">{item.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
