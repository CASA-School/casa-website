'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { trackCasaEvent } from '@/lib/analytics/client';

const CTA_CLASS_NAMES = ['casa-button-prism', 'casa-button-outline', 'casa-cta-link'] as const;

function hasTrackedClass(target: HTMLElement) {
  return CTA_CLASS_NAMES.some((className) => target.classList.contains(className));
}

function inferVariant(target: HTMLElement): 'primary' | 'secondary' | 'tertiary' | 'unknown' {
  if (target.classList.contains('casa-button-prism')) {
    return 'primary';
  }

  if (target.classList.contains('casa-button-outline')) {
    return 'secondary';
  }

  if (target.classList.contains('casa-cta-link')) {
    return 'tertiary';
  }

  return 'unknown';
}

function nearestSectionName(target: HTMLElement) {
  const explicit = target.closest<HTMLElement>('[data-track-section]');
  if (explicit) {
    return explicit.dataset.trackSection ?? 'unknown-section';
  }

  const semanticSection = target.closest<HTMLElement>('section[id], article[id], form[id]');
  if (semanticSection?.id) {
    return semanticSection.id;
  }

  const heroSection = target.closest<HTMLElement>('[data-hero-archetype]');
  if (heroSection?.dataset.heroArchetype) {
    return `hero-${heroSection.dataset.heroArchetype.toLowerCase()}`;
  }

  return 'page';
}

function extractLabel(target: HTMLElement) {
  if (target.dataset.casaLabel && target.dataset.casaLabel.trim().length > 0) {
    return target.dataset.casaLabel;
  }

  const ariaLabel = target.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return ariaLabel;
  }

  const text = target.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.slice(0, 120);
}

function extractHref(target: HTMLElement) {
  if (target instanceof HTMLAnchorElement) {
    return target.getAttribute('href') ?? target.href;
  }

  const nestedAnchor = target.querySelector('a[href]');
  if (nestedAnchor instanceof HTMLAnchorElement) {
    return nestedAnchor.getAttribute('href') ?? nestedAnchor.href;
  }

  return undefined;
}

export function InteractionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    let lastKey = '';
    let lastAt = 0;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.closest<HTMLElement>('a,button');
      if (!action || !action.closest('main')) {
        return;
      }

      const hasExplicitTrack = action.dataset.casaTrack === 'true' || Boolean(action.closest('[data-casa-track="true"]'));
      if (!hasExplicitTrack && !hasTrackedClass(action)) {
        return;
      }

      const key = `${pathname}|${extractLabel(action)}|${extractHref(action) ?? ''}`;
      const now = Date.now();
      if (key === lastKey && now - lastAt < 500) {
        return;
      }
      lastKey = key;
      lastAt = now;

      trackCasaEvent('cta_click', {
        label: extractLabel(action),
        href: extractHref(action),
        section: nearestSectionName(action),
        variant: inferVariant(action),
        path: pathname,
      });
    };

    const handleSubmit = (event: SubmitEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || !target.closest('main')) {
        return;
      }

      const form = target.dataset.casaTrackForm;
      if (!form) {
        return;
      }

      trackCasaEvent('form_submit', {
        form,
        section: nearestSectionName(target),
        path: pathname,
      });
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [pathname]);

  return null;
}
