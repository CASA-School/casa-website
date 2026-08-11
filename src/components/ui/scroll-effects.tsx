'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const REVEAL_SELECTOR = 'main > section, main > article, [data-reveal="true"]';

function isInInitialViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const threshold = window.innerHeight * 1.02;
  return rect.top <= threshold && rect.bottom >= 0;
}

export function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!elements.length) {
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.classList.add('is-visible');
          observer.unobserve(element);
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -4% 0px',
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

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
