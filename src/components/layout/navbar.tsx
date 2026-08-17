"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, Menu } from 'lucide-react';

import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { HeaderSearchPopover } from '@/components/layout/header-search-popover';
import { MobileNav } from '@/components/layout/mobile-nav';
import { localizeNavText, navConfig, NavDropdown, NavItem } from '@/config/nav';
import { iconMap } from '@/config/icon-map';
import { cn } from '@/lib/utils';
import { CONTENT_LOCALE_COOKIE } from '@/lib/content/locale';
import type { ContentLocale } from '@/lib/content/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CLOSE_DELAY_MS = 110;
const COURSES_PANEL_WIDTH_PX = 46 * 16;
const DEFAULT_PANEL_WIDTH_PX = 34 * 16;
const COMPACT_PANEL_WIDTH_PX = 28 * 16;

function navId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

type NavbarProps = {
  /**
   * Resolved on the server. Required: deriving it from document.cookie during
   * the first client render caused a hydration mismatch on every German page
   * (SSR had no cookie access, so it rendered English).
   */
  contentLocale: ContentLocale;
};

export function Navbar({ contentLocale: initialContentLocale }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navRef = useRef<HTMLElement | null>(null);
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scrolled, setScrolled] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownShiftByTrigger, setDropdownShiftByTrigger] = useState<Record<string, number>>({});
  const [contentLocale, setContentLocale] = useState<ContentLocale>(initialContentLocale);

  // Keep in sync when a server-rendered navigation changes the locale.
  useEffect(() => {
    setContentLocale(initialContentLocale);
  }, [initialContentLocale]);

  const isExamContext = pathname === '/registration/exam' || pathname === '/exams' || pathname?.startsWith('/exams/');
  const isRegistrationPage = pathname?.startsWith('/registration');
  const registerHref = isExamContext ? '/registration/exam' : '/registration/course';
  const registerText = isExamContext
    ? (contentLocale === 'de' ? 'Zur Prüfungsanmeldung' : 'Register for Exam')
    : (contentLocale === 'de' ? 'Zur Kursanmeldung' : 'Register Now');
  /*
   * Short form for the band between xl and 2xl.
   *
   * Measured at 1280, German: logo 142 + nav 735 + right cluster 297 = 1198 in a
   * 1200px frame — two pixels of headroom, which is not headroom. "Zur
   * Kursanmeldung" alone is 201px of that, and German runs longer than English
   * everywhere, so the tightest locale was the one shipping.
   *
   * Both labels are rendered and one is hidden by breakpoint rather than swapped
   * in JS, so there is no layout shift on hydration and no locale-dependent
   * measurement at runtime.
   */
  const registerTextShort = isExamContext
    ? (contentLocale === 'de' ? 'Prüfung' : 'Exam')
    : (contentLocale === 'de' ? 'Anmelden' : 'Register');

  const isActivePath = useCallback((href?: string) => {
    if (!href) {
      return false;
    }

    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  }, [pathname]);

  /*
   * Most specific top-level entry wins.
   *
   * `isActivePath` matches by prefix, so /courses/firmenunterricht satisfies
   * BOTH the Courses dropdown (href '/courses') and the "For Companies" link
   * (href '/courses/firmenunterricht') — two nav items reading as current, which
   * tells the visitor they are in two places at once.
   *
   * Removing the route from the Courses panel does not fix that: the conflict is
   * the dropdown's own href, not its contents. So instead of asking each entry
   * "do you match?", find the LONGEST matching href across the whole top level
   * and let only that one be current. Courses keeps /courses and every child not
   * claimed by a more specific entry, which also means an unlisted course route
   * still highlights Courses rather than nothing.
   */
  const activeHref = useMemo(() => {
    const candidates = navConfig.main
      .map((item) => ('trigger' in item ? (item as NavDropdown).href : (item as NavItem).href))
      .filter((href): href is string => !!href && isActivePath(href));

    return candidates.sort((a, b) => b.length - a.length)[0];
  }, [isActivePath]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const closeDropdown = useCallback(() => {
    clearCloseTimer();
    setActiveDropdown(null);
  }, [clearCloseTimer]);

  const computeDropdownShift = useCallback((trigger: string) => {
    if (!navRef.current || !navContainerRef.current) {
      return 0;
    }

    const triggerButton = navRef.current.querySelector<HTMLElement>(`[data-testid="nav-trigger-${navId(trigger)}"]`);
    if (!triggerButton) {
      return 0;
    }

    const containerBounds = navContainerRef.current.getBoundingClientRect();
    const baseWidth =
      trigger === 'Courses'
        ? COURSES_PANEL_WIDTH_PX
        : trigger === 'Resources'
          ? COMPACT_PANEL_WIDTH_PX
          : DEFAULT_PANEL_WIDTH_PX;
    const panelWidth = Math.min(
      baseWidth,
      window.innerWidth - 32,
      containerBounds.width
    );

    const triggerBounds = triggerButton.getBoundingClientRect();
    const panelLeft = triggerBounds.left;
    const panelRight = panelLeft + panelWidth;

    let shift = 0;
    if (panelLeft < containerBounds.left) {
      shift += containerBounds.left - panelLeft;
    }
    if (panelRight > containerBounds.right) {
      shift += containerBounds.right - panelRight;
    }

    return shift;
  }, []);

  const openDropdown = useCallback(
    (trigger: string) => {
      clearCloseTimer();
      const precomputedShift = computeDropdownShift(trigger);
      setDropdownShiftByTrigger((current) => {
        if (current[trigger] === precomputedShift) {
          return current;
        }
        return {
          ...current,
          [trigger]: precomputedShift,
        };
      });
      setActiveDropdown(trigger);
    },
    [clearCloseTimer, computeDropdownShift]
  );

  const positionDropdownWithinContainer = useCallback((trigger: string) => {
    if (!navRef.current || !navContainerRef.current) {
      return;
    }

    const triggerId = navId(trigger);
    const panel = navRef.current.querySelector<HTMLElement>(`[data-panel-trigger="${triggerId}"]`);
    if (!panel) {
      return;
    }

    const containerBounds = navContainerRef.current.getBoundingClientRect();
    const panelBounds = panel.getBoundingClientRect();

    let shift = 0;
    if (panelBounds.left < containerBounds.left) {
      shift += containerBounds.left - panelBounds.left;
    }
    if (panelBounds.right > containerBounds.right) {
      shift += containerBounds.right - panelBounds.right;
    }

    setDropdownShiftByTrigger((current) => {
      if (current[trigger] === shift) {
        return current;
      }
      return {
        ...current,
        [trigger]: shift,
      };
    });
  }, []);

  const scheduleCloseDropdown = useCallback(() => {
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    clearCloseTimer();
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 0);

    return () => clearTimeout(timeout);
  }, [pathname, clearCloseTimer]);

  useEffect(() => {
    if (!activeDropdown) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        closeDropdown();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeDropdown, closeDropdown]);

  useEffect(() => {
    if (!activeDropdown) {
      return;
    }

    let frame = requestAnimationFrame(() => {
      positionDropdownWithinContainer(activeDropdown);
    });

    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        positionDropdownWithinContainer(activeDropdown);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeDropdown, positionDropdownWithinContainer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const switchContentLocale = useCallback(
    (locale: ContentLocale) => {
      setContentLocale(locale);
      document.cookie = `${CONTENT_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router]
  );

  return (
    <header
      ref={navRef}
      className={cn(
        'sticky top-0 z-[900] h-20 border-b transition-[background-color,border-color,box-shadow] duration-200',
        scrolled || activeDropdown
          ? 'border-[color:var(--casa-sand)]/80 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-white/80'
          : 'border-transparent bg-white/65 backdrop-blur supports-[backdrop-filter]:bg-white/55'
      )}
    >
      {/*
        The actual Container, not a copy of its classes.

        This row used to restate `mx-auto w-full max-w-[var(--casa-container-max)]
        px-5 sm:px-8 lg:px-10` by hand, with a comment asking the next person to
        keep it in step — because Container could not carry a ref, and the nav
        needs both the alignment frame and the flex context on one element so
        the logo sits on the same optical line as the page content beneath it.

        Container takes a ref now, and its width and gutters come from the
        `[data-casa-site-frame]` rule rather than from utilities, so the flex
        classes below cannot collide with them. The two can no longer drift.

        (Earlier history: the gutters read `px-6 lg:px-5 xl:px-8` — narrowing at
        lg — because the nav row needed to claw back space it did not have.
        Dropping the secondary "Talk to Admissions" CTA returned ~180px, which
        is more than the gutter alignment costs.)
      */}
      {/*
        Three columns, not flex + ml-auto.

        `justify-between` put the nav immediately after the logo, so the links
        sat left-of-centre and drifted further left as the logo grew.

        [1fr_auto_1fr], NOT [auto_1fr_auto]. The latter centres the nav between
        the logo and the actions, which is only the frame centre if those two
        happen to be the same width — they are not (142px logo against a 230px
        action cluster), and it measured 77px off. Equal side columns centre the
        nav in the FRAME regardless of what flanks it.

        The grid is applied from xl ONLY, and that is a bug fix rather than an
        optimisation. Below xl the <nav> is `display: none`, which removes it
        from grid flow altogether — so the actions cluster fell into track 2 and
        the third track was left empty, parking the hamburger 45px short of the
        gutter on every phone and tablet. Flex + justify-between below xl has no
        tracks to mis-assign, so the logo and actions sit on their real edges.
      */}
      <Container
        ref={navContainerRef}
        className="flex h-full items-center justify-between gap-3 xl:grid xl:grid-cols-[1fr_auto_1fr]"
      >
        <Link href="/" aria-label="Go to CASA homepage" className="flex shrink-0 items-center focus-visible:outline-none">
          <Logo className="h-10 w-auto" />
        </Link>

        {/*
          The link row turns on at xl (1280), not lg (1024).

          Measured at 1024 on /exams in German: gutters 80 + logo 128 + margin
          16 + nav row 566 + right cluster 315 = 1105 against 1024 available.
          The page overflowed horizontally by 41px and produced a scrollbar on
          every German page in the 1024-1104 band.

          There is no version of trimming that survives translation. Cutting the
          per-item padding to lg:px-1.5 and dropping the left margin recovers
          56px — 15px of headroom — and the German labels are not fixed: the
          register CTA alone swings from "Zur Kursanmeldung" to
          "Zur Prüfungsanmeldung" depending on the page. Any fix with 15px of
          slack is a fix that breaks on the next label.

          So the drawer covers 1024-1279 instead. That band is iPad landscape
          and small laptops, which is a real cost, but a hamburger is a normal
          thing to meet there and a horizontal scrollbar is not. It also lets
          the remaining nav items take a comfortable px-3 instead of the
          cramped lg:px-2.5 they were squeezed into.
        */}
        <nav className="hidden h-full xl:flex" aria-label="Main navigation">
          <ul className="flex h-full items-stretch gap-1">
            {navConfig.main.map((item) => {
              const key = 'trigger' in item ? item.trigger : item.label;

              if ('trigger' in item) {
                const dropdown = item as NavDropdown;
                const dropdownId = `nav-dropdown-${navId(dropdown.trigger)}`;
                const isDropdownActive = !!dropdown.href && dropdown.href === activeHref;
                const isOpen = activeDropdown === dropdown.trigger;
                const panelWidthClass =
                  dropdown.trigger === 'Courses'
                    ? 'w-[46rem] max-w-[min(46rem,calc(100vw-2rem),calc(var(--casa-container-max)-5rem))]'
                    : dropdown.trigger === 'Resources'
                      ? 'w-[28rem] max-w-[min(28rem,calc(100vw-2rem),calc(var(--casa-container-max)-5rem))]'
                      : 'w-[34rem] max-w-[min(34rem,calc(100vw-2rem),calc(var(--casa-container-max)-5rem))]';
                const panelShift = dropdownShiftByTrigger[dropdown.trigger] ?? 0;

                return (
                  <li
                    key={key}
                    className="relative flex h-full items-center"
                    onMouseEnter={() => openDropdown(dropdown.trigger)}
                    onMouseLeave={scheduleCloseDropdown}
                  >
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                      aria-controls={dropdownId}
                      aria-current={isDropdownActive ? 'page' : undefined}
                      data-testid={`nav-trigger-${navId(dropdown.trigger)}`}
                      className={cn(
                        /*
                          Display face on the nav, matched to the headings.

                          Set at 15px semibold rather than 14px bold. Playfair is a
                          high-contrast Didone: its thin strokes thin out further as
                          weight drops and as size drops, so at 14px/700 the hairlines
                          alias on non-retina displays. One step up in size and one
                          step down in weight keeps the stroke contrast printable
                          while staying inside the existing nav height.
                        */
                        'font-display text-[15px] font-semibold',
                        /*
                          px-2 until 2xl. The row carries two more items than it
                          did and a larger logo, and at exactly 1280 — where the
                          desktop nav first appears — logo + items + right
                          cluster measured 1240px inside a 1200px frame, so the
                          page grew a horizontal scrollbar. Trimming 4px of
                          padding per side across seven items returns 56px, which
                          clears it without dropping to the mobile drawer on
                          every laptop.
                        */
                        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 2xl:px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                        isOpen
                          ? 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                          : isDropdownActive
                            ? 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                            : 'text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)] hover:text-[var(--casa-ink)]'
                      )}
                      onClick={() => {
                        if (isOpen) {
                          closeDropdown();
                          return;
                        }
                        openDropdown(dropdown.trigger);
                      }}
                      onFocus={() => openDropdown(dropdown.trigger)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                          event.preventDefault();
                          openDropdown(dropdown.trigger);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          closeDropdown();
                        }
                      }}
                    >
                      {localizeNavText(dropdown.trigger, contentLocale)}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 14 14"
                        className={cn('h-3 w-3 opacity-55 transition-transform', isOpen && 'rotate-180')}
                      >
                        <path
                          d="M3.5 5.25L7 8.75l3.5-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </button>

                    <div
                      id={dropdownId}
                      role="menu"
                      data-testid={`nav-panel-${navId(dropdown.trigger)}`}
                      data-panel-trigger={navId(dropdown.trigger)}
                      className={cn(
                        'absolute top-[calc(100%+10px)] z-50 rounded-3xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-hero)] transition-[opacity,transform] duration-200 will-change-transform',
                        panelWidthClass,
                        'left-0',
                        isOpen
                          ? 'visible opacity-100'
                          : 'pointer-events-none hidden opacity-0'
                      )}
                      style={{
                        transform: `translate3d(${panelShift}px, ${isOpen ? 0 : -4}px, 0)`,
                      }}
                      onMouseEnter={() => openDropdown(dropdown.trigger)}
                      onMouseLeave={scheduleCloseDropdown}
                    >
                      <div className="p-6">
                        <div
                          className={cn(
                            'grid gap-6',
                            dropdown.sections.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'
                          )}
                        >
                                {dropdown.sections.map((section) => (
                            <div key={`${dropdown.trigger}-${section.title}`} className="space-y-4">
                              {section.title && (
                                <h4 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                                  {localizeNavText(section.title, contentLocale)}
                                </h4>
                              )}

                              <ul className="space-y-2">
                                {section.items.map((subItem) => {
                                  const Icon = subItem.icon ? iconMap[subItem.icon] : null;
                                  return (
                                    <li key={subItem.href}>
                                        <Link
                                          href={subItem.href}
                                          aria-current={isActivePath(subItem.href) ? 'page' : undefined}
                                          className={cn(
                                            'group/item flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--casa-canvas)]',
                                            isActivePath(subItem.href)
                                              ? 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                                              : 'text-[var(--casa-ink)]'
                                          )}
                                          onClick={closeDropdown}
                                        >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--casa-sand)] bg-white text-[var(--casa-text-subtle)] transition-colors group-hover/item:border-[var(--casa-blue)]/20 group-hover/item:text-[var(--casa-accent-text)]">
                                          {Icon ? <Icon className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--casa-sand)]" />}
                                        </div>

                                        <div>
                                          <p className="text-sm font-semibold text-[var(--casa-ink)] group-hover/item:text-[var(--casa-accent-text)]">
                                            {localizeNavText(subItem.label, contentLocale)}
                                          </p>
                                          {subItem.description && (
                                            <p className="mt-0.5 text-xs text-[var(--casa-muted)]">
                                              {localizeNavText(subItem.description, contentLocale)}
                                            </p>
                                          )}
                                        </div>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {dropdown.href && (
                          <div className="mt-5 border-t border-[color:var(--casa-sand)]/70 pt-4">
                            <Link
                              href={dropdown.href}
                              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                              onClick={closeDropdown}
                            >
                              {contentLocale === 'de'
                                ? `${localizeNavText(dropdown.trigger, contentLocale)} ansehen`
                                : `Browse ${dropdown.trigger}`}
                              <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3 w-3">
                                <path
                                  d="M4.5 3.5L8 7l-3.5 3.5M8 7h1.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              }

              const linkItem = item as NavItem;
              const isLinkActive = linkItem.href === activeHref;
              return (
                <li key={key} className="flex h-full items-center">
                  <Link
                    href={linkItem.href}
                    aria-current={isLinkActive ? 'page' : undefined}
                    className={cn(
                      'font-display text-[15px] font-semibold',
                      'whitespace-nowrap rounded-full px-2 2xl:px-4 py-2 transition-colors',
                      isLinkActive
                        ? 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                        : 'text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)] hover:text-[var(--casa-ink)]'
                    )}
                    onFocus={closeDropdown}
                    onClick={closeDropdown}
                  >
                    {/*
                      Localised, like every other label in this file. The plain-link
                      branch rendered `linkItem.label` raw — invisible until now
                      because navConfig.main had no plain links, so a German visitor
                      would have seen the only two English words in the nav.
                      mobile-nav.tsx already did this correctly.
                    */}
                    {localizeNavText(linkItem.label, contentLocale)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <HeaderSearchPopover locale={contentLocale} isActive={isActivePath('/search')} />

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="locale-trigger"
                  aria-label={`Select content language, current ${contentLocale === 'de' ? 'Deutsch' : 'English'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] p-2 text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                >
                  <Globe className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-[calc(1.25rem+6px)] min-w-[140px] rounded-xl border-[color:var(--casa-sand)] p-2 shadow-[var(--shadow-modal)]">
                <DropdownMenuItem
                  data-testid="locale-option-en"
                  className={cn(
                    'cursor-pointer rounded-xl px-4 py-3 font-bold',
                    contentLocale === 'en' && 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                  )}
                  onSelect={() => switchContentLocale('en')}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="locale-option-de"
                  className={cn(
                    'cursor-pointer rounded-xl px-4 py-3 font-bold',
                    contentLocale === 'de' && 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                  )}
                  onSelect={() => switchContentLocale('de')}
                >
                  Deutsch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              aria-label="Language options"
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] p-2 text-[var(--casa-muted)]"
            >
              <Globe className="h-5 w-5" />
            </button>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            {/*
              The secondary "Talk to Admissions" CTA used to sit here as a
              second filled-weight control, gated behind `min-[1400px]` because
              the nav row could not fit both. Removed rather than re-gated.
              Two competing buttons in a header is one decision too many at the
              exact moment a visitor has not made the first one, and the
              breakpoint gate meant the nav offered a different set of choices
              depending on how wide your monitor was.

              /contact was not in the nav config at all, so deleting the button
              outright would have removed the only desktop-header route to it.
              It is now the last item of the Our School dropdown (src/config/nav.ts)
              — available at every width, rather than only above 1400px.
            */}

            {/*
              The register CTA carries no shadow utility on purpose:
              `.casa-button-prism` is unlayered and sets its own box-shadow, so
              it beats any Tailwind shadow class. The `shadow-lg shadow-[…]/20`
              this replaced was already dead code. That class's elevation is
              still the retired cold-slate physics — tracked in the review doc
              §4.4, not fixed here, because it repaints the CTA on 31 call sites.
            */}
            {!isRegistrationPage && (
              <Button asChild className="h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 font-bold text-white transition hover:bg-[var(--casa-ink-deep-hover)] xl:px-7">
                <Link href={registerHref}>
                  <span className="2xl:hidden">{registerTextShort}</span>
                  <span className="hidden 2xl:inline">{registerText}</span>
                </Link>
              </Button>
            )}
          </div>

          <div className="xl:hidden">
            {mounted ? (
              <MobileNav contentLocale={contentLocale} />
            ) : (
              <Button
                aria-label="Open navigation menu"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-[color:var(--casa-sand)] xl:hidden"
                disabled
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
