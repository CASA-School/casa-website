'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { CasaImage } from '@/components/ui/casa-image';
import type { ContentLocale } from '@/lib/content/types';
import type { HeroPhoto } from './shared';
import styles from './hero-photo-reel.module.css';

const HOLD_MS = 6500;
const DISSOLVE_MS = 1400;

export function HeroPhotoReel({ photos, locale, children }: { photos: HeroPhoto[]; locale: ContentLocale; children: ReactNode }) {
  const de = locale === 'de';
  const instructionsId = useId();
  const root = useRef<HTMLDivElement>(null);
  const imageLayers = useRef<(HTMLDivElement | null)[]>([]);
  const movements = useRef(new Map<number, Animation>());
  const progress = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set());
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const playing = !paused && !hovered && inView && tabVisible && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setTabVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    if (root.current) observer.observe(root.current);
    updateMotion();
    updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  const adjacent = useCallback((direction: number) => {
    for (let step = 1; step < photos.length; step++) {
      const index = (active + direction * step + photos.length) % photos.length;
      if (!failed.has(index)) return index;
    }
    return active;
  }, [active, failed, photos.length]);

  const select = useCallback((index: number) => {
    if (index === active || previous !== null || !loaded.has(index)) return;
    elapsed.current = 0;
    setPrevious(reducedMotion ? null : active);
    setActive(index);
  }, [active, previous, loaded, reducedMotion]);

  function selectManually(index: number) {
    setPaused(true);
    select(index);
  }

  // Keep the outgoing image opaque under the incoming dissolve: no dark flash.
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), reducedMotion ? 0 : DISSOLVE_MS);
    return () => window.clearTimeout(timer);
  }, [previous, reducedMotion]);

  // Native compositor animations can pause at their exact position. The
  // outgoing layer retains that position until its dissolve has completed.
  useEffect(() => {
    if (reducedMotion) {
      movements.current.forEach(animation => animation.cancel());
      movements.current.clear();
      return;
    }
    const layer = imageLayers.current[active];
    if (!layer) return;
    movements.current.get(active)?.cancel();
    // Leave the framing intact: excessive zoom crops hair and building details.
    const endScale = 1.02;
    const frames = active % 2 === 0
      ? [{ transform: 'scale(1)' }, { transform: `scale(${endScale})` }]
      : [{ transform: `scale(${endScale})` }, { transform: 'scale(1)' }];
    const animation = layer.animate(frames, { duration: HOLD_MS + DISSOLVE_MS, easing: 'linear', fill: 'both' });
    animation.pause();
    movements.current.set(active, animation);
    return () => animation.pause();
  }, [active, reducedMotion]);

  useEffect(() => {
    const animation = movements.current.get(active);
    if (playing && loaded.has(active)) animation?.play();
    else animation?.pause();
  }, [active, loaded, playing, reducedMotion]);

  // Updating only the progress element avoids rendering React on every frame.
  // Hold the current photograph if the next image has not finished loading.
  useEffect(() => {
    if (!playing || !loaded.has(active)) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current = Math.min(HOLD_MS, elapsed.current + now - last);
      last = now;
      if (progress.current) progress.current.style.transform = `scaleX(${elapsed.current / HOLD_MS})`;
      const next = adjacent(1);
      if (elapsed.current >= HOLD_MS && previous === null && next !== active && loaded.has(next)) {
        select(next);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, adjacent, loaded, playing, previous, select]);

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription={de ? 'Bilderkarussell' : 'carousel'}
      aria-label={de ? 'Einblicke in CASA' : 'A glimpse of CASA'}
      aria-describedby={instructionsId}
      tabIndex={0}
      className={styles.reel}
      data-playing={playing}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && event.target.matches(':focus-visible')) setPaused(true);
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          selectManually(adjacent(event.key === 'ArrowRight' ? 1 : -1));
        }
        if (event.key === ' ' && event.target === event.currentTarget) {
          event.preventDefault();
          setPaused(value => !value);
        }
      }}
    >
      <p id={instructionsId} className="sr-only">
        {de
          ? 'Automatische Bildfolge. Bild auswählen, um den Wechsel anzuhalten. Pfeiltasten wechseln das Bild; die Leertaste pausiert oder startet die Bildfolge.'
          : 'Automatic photo reel. Choosing a photo stops automatic rotation. Arrow keys change the photo; the space bar pauses or resumes the reel.'}
      </p>
      <div
        className={styles.frame}
        onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { pointer.current = null; }}
        onPointerUp={event => {
          const start = pointer.current;
          pointer.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) selectManually(adjacent(dx < 0 ? 1 : -1));
        }}
      >
        <div className={styles.viewport}>
        {photos.map((photo, index) => (
          <div
            key={photo.src}
            role="group"
            aria-roledescription={de ? 'Bild' : 'slide'}
            aria-label={`${index + 1} / ${photos.length}`}
            aria-hidden={index !== active}
            inert={index !== active}
            className={styles.slide}
            style={{ opacity: index === active || index === previous ? 1 : 0, zIndex: index === active ? 2 : 1 }}
          >
            <div ref={element => { imageLayers.current[index] = element; }} className={styles.image}>
              <CasaImage
                src={photo.src}
                alt={photo.alt}
                fill
                preload={index === 0}
                loading={index === 0 ? undefined : 'lazy'}
                sizes="(min-width: 1680px) 1680px, 100vw"
                className="object-cover"
                style={{ objectPosition: photo.objectPosition ?? '50% 50%' }}
                onLoad={() => setLoaded(value => new Set(value).add(index))}
                onError={() => setFailed(value => new Set(value).add(index))}
              />
            </div>
          </div>
        ))}
        </div>
        <div className={styles.overlay}>{children}</div>
      </div>
      <p className="sr-only" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{active + 1} / {photos.length}: {photos[active].caption}</p>
      <div className={styles.timeline} aria-label={de ? 'Bild auswählen' : 'Choose a photo'}>
        {photos.map((photo, index) => <button key={photo.src} type="button" aria-label={`${de ? 'Bild' : 'Photo'} ${index + 1}: ${photo.caption}`} aria-current={index === active ? 'true' : undefined} disabled={!loaded.has(index) || failed.has(index)} onClick={() => selectManually(index)}>
          <span className={styles.track}><span key={index === active ? `active-${active}` : 'rest'} ref={index === active ? progress : undefined} className={styles.fill} style={{ transform: `scaleX(${index < active || (index === active && reducedMotion) ? 1 : 0})` }} /></span>
        </button>)}
      </div>
    </div>
  );
}
