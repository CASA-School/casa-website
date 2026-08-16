"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, Menu } from 'lucide-react';

import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
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

  const isActivePath = useCallback((href?: string) => {
    if (!href) {
      return false;
    }

    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  }, [pathname]);

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
      <div ref={navContainerRef} className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 lg:px-5 xl:px-8">
        <Link href="/" aria-label="Go to CASA homepage" className="flex shrink-0 items-center focus-visible:outline-none">
          <Logo className="h-9 w-auto" />
        </Link>

        <nav className="lg:ml-4 xl:ml-10 hidden h-full lg:flex" aria-label="Main navigation">
          <ul className="flex h-full items-stretch gap-1">
            {navConfig.main.map((item) => {
              const key = 'trigger' in item ? item.trigger : item.label;

              if ('trigger' in item) {
                const dropdown = item as NavDropdown;
                const dropdownId = `nav-dropdown-${navId(dropdown.trigger)}`;
                const isDropdownActive = isActivePath(dropdown.href);
                const isOpen = activeDropdown === dropdown.trigger;
                const panelWidthClass =
                  dropdown.trigger === 'Courses'
                    ? 'w-[46rem] max-w-[min(46rem,calc(100vw-2rem),calc(1440px-5rem))]'
                    : dropdown.trigger === 'Resources'
                      ? 'w-[28rem] max-w-[min(28rem,calc(100vw-2rem),calc(1440px-5rem))]'
                      : 'w-[34rem] max-w-[min(34rem,calc(100vw-2rem),calc(1440px-5rem))]';
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
                        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full lg:px-2.5 xl:px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
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
              const isLinkActive = isActivePath(linkItem.href);
              return (
                <li key={key} className="flex h-full items-center">
                  <Link
                    href={linkItem.href}
                    aria-current={isLinkActive ? 'page' : undefined}
                    className={cn(
                      'whitespace-nowrap rounded-full lg:px-2.5 xl:px-4 py-2 text-sm font-bold transition-colors',
                      isLinkActive
                        ? 'bg-[var(--casa-surface-subtle)] text-[var(--casa-ink)]'
                        : 'text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)] hover:text-[var(--casa-ink)]'
                    )}
                    onFocus={closeDropdown}
                    onClick={closeDropdown}
                  >
                    {linkItem.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
              Was `2xl:inline-flex`, so the secondary CTA only appeared at
              >=1536px and was display:none at 1440 — the most common desktop
              width. Measured with it shown: the nav row's intrinsic width is
              1342px, so it overflows the page below ~1360 and fits 1366 with
              exactly 0px of slack. 1400 is the narrowest threshold with real
              headroom, which matters because the German label
              ("Beratung anfragen") is not the one that was measured.
              Do not lower this to `xl` (1280) — that reintroduces the
              horizontal overflow MEMORY.md §4 records as already fixed once.
              See docs/PREMIUM_UI_REVIEW_2026-08-16.md §1.4.
            */}
            <Button asChild variant="outline" className="hidden h-11 rounded-lg casa-button-outline border-[color:var(--casa-sand)] min-[1400px]:inline-flex">
              <Link href="/contact">{contentLocale === 'de' ? 'Beratung anfragen' : 'Talk to Admissions'}</Link>
            </Button>

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
                <Link href={registerHref}>{registerText}</Link>
              </Button>
            )}
          </div>

          <div className="lg:hidden">
            {mounted ? (
              <MobileNav contentLocale={contentLocale} />
            ) : (
              <Button
                aria-label="Open navigation menu"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-[color:var(--casa-sand)] lg:hidden"
                disabled
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
