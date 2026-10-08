'use client';

import { useEffect, type RefObject } from 'react';

/**
 * The warm light of a night hero, following the pointer across the WHOLE hero
 * rather than only the drawing's box. Pair it with `.glow` from
 * hero-glow.module.css on an element inside the drawing: that element reaches
 * far past the drawing on every side and the hero section clips it, so the
 * light can travel over the headline too.
 *
 * Only for a fine pointer and with motion allowed; otherwise the light rests
 * centred on the drawing (the CSS default). One rAF per frame at most.
 */
export function useHeroGlow(glow: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = glow.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;

    const hero = el.closest('section') ?? el.parentElement;
    if (!hero) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      el.style.setProperty('--glow-x', `${Math.round(x - box.left)}px`);
      el.style.setProperty('--glow-y', `${Math.round(y - box.top)}px`);
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      el.style.removeProperty('--glow-x');
      el.style.removeProperty('--glow-y');
    };

    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [glow]);
}
