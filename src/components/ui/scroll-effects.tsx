'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const REVEAL_SELECTOR = 'main > section, main > article, [data-reveal="true"]';

/*
 * A group whose children enter one after another: the cards of a grid, steps, figures. The group
 * is observed, not each child, so they come in together and in order (globals.css, §Motion).
 */
const STAGGER_SELECTOR = '[data-stagger]';

/** The seventh child onwards comes in with the sixth: a long list must not keep the reader waiting. */
const STAGGER_CAP = 6;

/** Must match globals.css: the group's first child waits 60ms, each next one 70ms more. */
const STAGGER_BASE_MS = 60;
const STAGGER_STEP_MS = 70;

/**
 * When the classes come off again: the longest a group can still be moving (the steps' line, 600ms,
 * after the sixth step's 120ms steps) with room to spare. Until then a card's own hover transition
 * is the reveal's, so it must not wait longer than it has to.
 */
const STAGGER_SETTLE_MS = 1500;
const SECTION_MS = 420;

const COUNT_MS = 600;

function isInInitialViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const threshold = window.innerHeight * 1.02;
  return rect.top <= threshold && rect.bottom >= 0;
}

function formatCount(value: number, group: string) {
  const digits = String(value);
  return group ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, group) : digits;
}

/**
 * A figure counts up from zero to the number the server wrote (`data-count-to`), then gets that
 * exact text back. Its width is held while it counts, so nothing beside it moves. Only the text
 * node's value changes, not the node, so React keeps the node it rendered.
 */
function countUp(element: HTMLElement, delay: number) {
  const to = Number(element.dataset.countTo);
  const text = element.firstChild;
  if (!Number.isFinite(to) || to <= 0 || !(text instanceof Text)) {
    return undefined;
  }

  const final = text.nodeValue ?? '';
  const group = element.dataset.countGroup ?? '';
  element.style.minWidth = `${element.getBoundingClientRect().width}px`;
  text.nodeValue = formatCount(0, group);

  let frame = 0;
  let start = 0;
  const finish = () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    text.nodeValue = final;
    element.style.minWidth = '';
  };

  const step = (now: number) => {
    start ||= now;
    const t = Math.min(1, (now - start) / COUNT_MS);
    if (t >= 1) {
      finish();
      return;
    }
    // Quartic ease-out: close to the reveal's curve, so the figure settles as its card lands.
    text.nodeValue = formatCount(Math.round(to * (1 - (1 - t) ** 4)), group);
    frame = requestAnimationFrame(step);
  };

  const timer = window.setTimeout(() => {
    frame = requestAnimationFrame(step);
  }, delay);
  return finish;
}

export function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    const groups = Array.from(document.querySelectorAll<HTMLElement>(STAGGER_SELECTOR));
    if (!elements.length && !groups.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      elements.forEach((element) => {
        element.classList.remove('casa-reveal-init');
        element.classList.add('is-visible');
      });
      return;
    }

    // Cleared when the page changes; a figure caught mid-count gets its own text back.
    const timers = new Set<number>();
    const counting = new Set<() => void>();

    // The classes come off once the motion has played: no element keeps a layer or a transform.
    const settle = (element: HTMLElement, className: string, after: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        element.classList.remove(className);
      }, after);
      timers.add(timer);
    };

    const revealGroup = (group: HTMLElement) => {
      group.classList.add('is-visible');
      settle(group, 'casa-stagger-init', STAGGER_SETTLE_MS);

      group.querySelectorAll<HTMLElement>('[data-count-to]').forEach((figure) => {
        const item = Array.from(group.children).find((child) => child.contains(figure)) as HTMLElement | undefined;
        const index = Number(item?.style.getPropertyValue('--stagger-i') || 0);
        const finish = countUp(figure, STAGGER_BASE_MS + index * STAGGER_STEP_MS);
        if (finish) {
          counting.add(finish);
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          observer.unobserve(element);

          if (element.classList.contains('casa-stagger-init')) {
            revealGroup(element);
            return;
          }

          element.classList.add('is-visible');
          const delay = parseFloat(element.style.getPropertyValue('--reveal-delay')) || 0;
          settle(element, 'casa-reveal-init', delay + SECTION_MS + 80);
        });
      },
      /*
       * A pixel line, not a share of the section: the line is 8% above the viewport's foot and
       * a section reveals once its top crosses it. It was `threshold: 0.08`, 8% of the section
       * in view, which a section taller than about twelve viewports never reaches: a course
       * page on a phone is one 9,700px section, and 8% of it is more than a 812px screen holds,
       * so the whole page stayed blank (2026-10-20).
       */
      {
        threshold: 0,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    elements.forEach((element, index) => {
      if (element.dataset.revealDisabled === 'true') {
        return;
      }

      if (!element.style.getPropertyValue('--reveal-delay')) {
        element.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 24}ms`);
      }

      if (isInInitialViewport(element)) {
        element.classList.remove('casa-reveal-init');
        element.classList.add('is-visible');
        return;
      }

      element.classList.add('casa-reveal-init');
      observer.observe(element);
    });

    // What is on the first screen stays as the server drew it: no group waits, no figure counts.
    groups.forEach((group) => {
      if (isInInitialViewport(group)) {
        return;
      }

      Array.from(group.children).forEach((child, index) => {
        (child as HTMLElement).style.setProperty('--stagger-i', String(Math.min(index, STAGGER_CAP)));
      });
      group.classList.add('casa-stagger-init');
      observer.observe(group);
    });

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      counting.forEach((finish) => finish());
    };
  }, [pathname]);

  return null;
}
