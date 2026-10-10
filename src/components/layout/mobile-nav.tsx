'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Mail, Menu, Phone, X } from 'lucide-react';

import { footerText } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { meaningClasses } from '@/config/brand/meaning';
import { footerConfig } from '@/config/footer';
import { iconMap } from '@/config/icon-map';
import { localizeNavDescription, localizeNavText, navConfig, type NavDropdown, type NavItem } from '@/config/nav';
import { Link, usePathname } from '@/i18n/navigation';
import { localizeHref } from '@/i18n/pathnames';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

/**
 * The phone and tablet menu (2026-10-09): a drill-down, not an accordion.
 *
 * The accordion it replaced made every top-level item a toggle, so the pages
 * the items are named after — /courses, /exams, /accommodation, /about — could
 * not be reached from the menu at all. Here a top-level item opens its own
 * panel, and the panel's first row is that overview page (`overview` in
 * src/config/nav.ts). Every page in the menu is now one or two taps away.
 *
 * The panels slide sideways, the way a phone's own settings do; the main list
 * is large serif type on the page ground, the rows inside a panel are white
 * cards with icons in the logo colour of that part of the school. Escape steps
 * back out of a panel before it closes the menu.
 */

type MobileNavProps = {
  /** Resolved on the server — see the note in Navbar about hydration. */
  contentLocale: ContentLocale;
};

const copy = {
  de: {
    title: 'Menü',
    description: 'Die Bereiche der CASA-Website, die Sprachwahl, die Anmeldung und der Kontakt zur Schule.',
    back: 'Menü',
    close: 'Navigation schließen',
    language: 'Sprache',
    help: 'Fragen? Wir helfen dir gern.',
    call: 'Anrufen',
    email: 'E-Mail',
    advice: 'Beratung anfragen',
    registerCourse: 'Zur Kursanmeldung',
    registerExam: 'Zur Prüfungsanmeldung',
  },
  en: {
    title: 'Menu',
    description: 'The sections of the CASA website, the language, registration and how to reach the school.',
    back: 'Menu',
    close: 'Close navigation menu',
    language: 'Language',
    help: 'Questions? We’re happy to help.',
    call: 'Call',
    email: 'Email',
    advice: 'Get advice',
    registerCourse: 'Register for a course',
    registerExam: 'Register for an exam',
  },
} as const;

const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';
const RISE = 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 [animation-fill-mode:both]';

const isDropdown = (item: NavDropdown | NavItem): item is NavDropdown => 'trigger' in item;

export function MobileNav({ contentLocale: initialContentLocale }: MobileNavProps) {
  const { say } = useSiteCopy();
  const router = useRouter();
  const pathname = usePathname();
  const [contentLocale, setContentLocale] = useState<ContentLocale>(initialContentLocale);
  const t = copy[contentLocale === 'de' ? 'de' : 'en'];

  useEffect(() => {
    setContentLocale(initialContentLocale);
  }, [initialContentLocale]);

  const [open, setOpen] = useState(false);
  // `panel` is the dropdown on screen; `shown` keeps its content mounted while it slides away.
  const [panel, setPanel] = useState<number | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const backRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const returnTo = useRef<number | null>(null);

  const isCurrent = useCallback(
    (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`)),
    [pathname]
  );
  const currentIndex = navConfig.main.findIndex((item) =>
    isDropdown(item)
      ? (item.href && isCurrent(item.href)) || item.sections.some((s) => s.items.some((sub) => isCurrent(sub.href)))
      : isCurrent(item.href)
  );

  const isExamContext = pathname === '/registration/exam' || pathname === '/exams' || pathname?.startsWith('/exams/');
  const isRegistrationPage = pathname?.startsWith('/registration');

  const openPanel = (index: number) => {
    setShown(index);
    setPanel(index);
    setOpenCount((n) => n + 1);
  };
  const goBack = () => {
    returnTo.current = panel;
    setPanel(null);
  };

  useEffect(() => {
    if (panel !== null) {
      backRef.current?.focus({ preventScroll: true });
    } else if (returnTo.current !== null) {
      rowRefs.current[returnTo.current]?.focus({ preventScroll: true });
      returnTo.current = null;
    }
  }, [panel]);

  const switchContentLocale = useCallback(
    (locale: ContentLocale) => {
      setContentLocale(locale);
      // The language is part of the URL: open this page in the other language.
      router.push(localizeHref(`${pathname ?? '/'}${window.location.search}${window.location.hash}`, locale));
    },
    [pathname, router]
  );

  const dropdown = shown !== null ? (navConfig.main[shown] as NavDropdown) : null;
  const meaning = meaningClasses[dropdown?.meaning ?? 'orientation'];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPanel(null);
          setShown(null);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button aria-label="Open navigation menu" variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-[color:var(--casa-sand)] xl:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (panel !== null) {
            event.preventDefault();
            goBack();
          }
        }}
        className="w-full max-w-none gap-0 overflow-hidden border-l-0 bg-[var(--casa-ground)] p-0 [background-image:var(--casa-grain)] sm:max-w-none"
      >
        <SheetTitle className="sr-only">{t.title}</SheetTitle>
        <SheetDescription className="sr-only">{t.description}</SheetDescription>

        <div className="relative flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
          <SheetClose asChild>
            <Link href="/" aria-label="Go to CASA homepage" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]">
              <Logo className="h-8 w-auto" />
            </Link>
          </SheetClose>
          <div className="flex items-center gap-2">
            <div role="group" aria-label={t.language} className="flex h-10 items-center rounded-full border border-[color:var(--casa-sand)] bg-white p-1">
              {(['de', 'en'] as const).map((locale) => {
                const active = contentLocale === locale;
                return (
                  <button
                    key={locale}
                    type="button"
                    lang={locale}
                    data-testid={`mobile-locale-option-${locale}`}
                    aria-pressed={active}
                    aria-label={say(locale, 'Deutsch', 'English')}
                    onClick={() => (active ? undefined : switchContentLocale(locale))}
                    className={cn(
                      'h-8 min-w-9 rounded-full px-2.5 text-xs font-bold uppercase tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]',
                      active ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                    )}
                  >
                    {locale}
                  </button>
                );
              })}
            </div>
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t.close}
                className="inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-ground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
              >
                <X className="size-4" />
              </button>
            </SheetClose>
          </div>
          <span aria-hidden className="casa-logo-stripe absolute inset-x-0 bottom-0 h-[3px]" />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* The main list. */}
          <nav
            aria-label={t.title}
            inert={panel !== null}
            className={cn(
              'absolute inset-0 overflow-y-auto overscroll-contain transition-[translate,opacity] duration-[420ms] motion-reduce:transition-none',
              EASE,
              panel !== null ? '-translate-x-[28%] opacity-0' : 'translate-x-0 opacity-100'
            )}
          >
            <ul className="mx-auto max-w-xl px-5 pt-3 sm:px-8">
              {navConfig.main.map((item, index) => {
                const current = index === currentIndex;
                const label = localizeNavText(isDropdown(item) ? item.trigger : item.label, contentLocale, say);
                const rowClass = cn(
                  'group flex w-full items-center justify-between gap-4 py-[1.05rem] text-left font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--casa-ground)]',
                  current ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-ink)]'
                );
                return (
                  <li
                    key={index}
                    className={cn('border-b border-[color:var(--casa-sand)]/80', RISE)}
                    style={{ animationDelay: `${60 + index * 45}ms` }}
                  >
                    {isDropdown(item) ? (
                      <button
                        ref={(node) => {
                          rowRefs.current[index] = node;
                        }}
                        type="button"
                        onClick={() => openPanel(index)}
                        aria-expanded={panel === index}
                        aria-controls="mobile-nav-panel"
                        className={rowClass}
                      >
                        <span>{label}</span>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                          <ChevronRight className="size-4" aria-hidden />
                        </span>
                      </button>
                    ) : (
                      <SheetClose asChild>
                        <Link href={item.href} aria-current={current ? 'page' : undefined} className={rowClass}>
                          <span>{label}</span>
                          <span className="flex size-9 shrink-0 items-center justify-center text-[var(--casa-muted)]">
                            <ArrowRight className="size-4" aria-hidden />
                          </span>
                        </Link>
                      </SheetClose>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Guidance, so on the warm panel: a phone call is a phone's own shortcut to the school. */}
            <div className={cn('mx-auto max-w-xl px-5 pb-8 pt-8 sm:px-8', RISE)} style={{ animationDelay: '360ms' }}>
              <div className="rounded-2xl bg-[var(--casa-warm-panel)] p-5">
                <p className="font-display text-lg font-semibold text-[var(--casa-ink)]">{t.help}</p>
                <ul className="mt-1.5 space-y-0.5 text-[0.8125rem] leading-relaxed text-[var(--casa-muted)]">
                  {footerConfig.contact.officeHours.map((entry) => (
                    <li key={entry}>{footerText(entry, contentLocale, say)}</li>
                  ))}
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${footerConfig.contact.phone.replace(/\s+/g, '')}`}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[var(--casa-ink)] shadow-[var(--shadow-soft)] transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
                  >
                    <Phone className="size-4" aria-hidden />
                    {t.call}
                  </a>
                  <a
                    href={footerConfig.contact.emails[0]?.href ?? 'mailto:info@casa-bremen.de'}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[var(--casa-ink)] shadow-[var(--shadow-soft)] transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
                  >
                    <Mail className="size-4" aria-hidden />
                    {t.email}
                  </a>
                </div>
              </div>
            </div>
          </nav>

          {/* The open dropdown, sliding in over the list. */}
          <div
            id="mobile-nav-panel"
            role="region"
            aria-label={dropdown ? localizeNavText(dropdown.trigger, contentLocale, say) : undefined}
            inert={panel === null}
            className={cn(
              'absolute inset-0 overflow-y-auto overscroll-contain bg-[var(--casa-ground)] [background-image:var(--casa-grain)] transition-[translate] duration-[420ms] motion-reduce:transition-none',
              EASE,
              panel !== null ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {dropdown ? (
              <div key={openCount} className="mx-auto max-w-xl px-5 pb-10 pt-2 sm:px-8">
                <button
                  ref={backRef}
                  type="button"
                  onClick={goBack}
                  className="-ml-2.5 inline-flex h-11 items-center gap-1 rounded-full pl-1.5 pr-3 text-sm font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                  {t.back}
                </button>
                <h2 className={cn('mt-1 font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--casa-ink)]', RISE)}>
                  {localizeNavText(dropdown.trigger, contentLocale, say)}
                </h2>

                {dropdown.overview && dropdown.href ? (
                  <SheetClose asChild>
                    <Link
                      href={dropdown.href}
                      aria-current={pathname === dropdown.href ? 'page' : undefined}
                      className={cn(
                        'group mt-5 flex items-center gap-4 rounded-2xl bg-[var(--casa-ink-deep)] p-4 pl-5 text-white shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--casa-ink-deep-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2',
                        RISE
                      )}
                      style={{ animationDelay: '60ms' }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">{localizeNavText(dropdown.overview.label, contentLocale, say)}</span>
                        <span className="mt-0.5 block text-[0.8125rem] text-white/70">
                          {localizeNavDescription(dropdown.overview.description, contentLocale, say)}
                        </span>
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                        <ArrowRight className="size-4" aria-hidden />
                      </span>
                    </Link>
                  </SheetClose>
                ) : null}

                {dropdown.sections.map((section, sectionIndex) => (
                  <section
                    key={section.title}
                    className={cn('mt-7', RISE)}
                    style={{ animationDelay: `${120 + sectionIndex * 70}ms` }}
                  >
                    <h3 className="px-1 text-[0.9375rem] font-semibold text-[var(--casa-muted)]">
                      {localizeNavText(section.title, contentLocale, say)}
                    </h3>
                    <ul className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
                      {section.items.map((sub, itemIndex) => {
                        const Icon = sub.icon ? iconMap[sub.icon] : null;
                        const active = isCurrent(sub.href);
                        return (
                          <li key={sub.href} className="relative">
                            {itemIndex > 0 ? (
                              <span aria-hidden className="absolute left-[4.25rem] right-0 top-0 h-px bg-[color:var(--casa-sand)]/70" />
                            ) : null}
                            <SheetClose asChild>
                              <Link
                                href={sub.href}
                                aria-current={active ? 'page' : undefined}
                                className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[var(--casa-ground)]/60 focus-visible:bg-[var(--casa-ground)] focus-visible:outline-none active:bg-[var(--casa-ground)]"
                              >
                                {Icon ? (
                                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', meaning.circle)}>
                                    <Icon className="size-5" aria-hidden />
                                  </span>
                                ) : null}
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      'block text-[0.9375rem] font-semibold leading-snug',
                                      active ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-ink)]'
                                    )}
                                  >
                                    {localizeNavText(sub.label, contentLocale, say)}
                                  </span>
                                  {sub.description ? (
                                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--casa-muted)]">
                                      {localizeNavDescription(sub.description, contentLocale, say)}
                                    </span>
                                  ) : null}
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-[var(--casa-text-subtle)] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                              </Link>
                            </SheetClose>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/*
          One button, one text link — not two stacked full-width buttons.
          Registration is the action the filled control is for; advice is a
          question, and a question reads correctly as a link.
        */}
        <div className="shrink-0 border-t border-[color:var(--casa-sand)]/80 bg-white/85 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-8">
          <div className="mx-auto grid max-w-xl gap-2">
            {!isRegistrationPage && (
              <Button asChild className="h-12 w-full rounded-xl casa-button-prism bg-[var(--casa-ink-deep)] text-[0.9375rem] font-bold text-white hover:bg-[var(--casa-ink-deep-hover)]">
                <SheetClose asChild>
                  <Link href={isExamContext ? '/registration/exam' : '/registration/course'}>
                    {isExamContext ? t.registerExam : t.registerCourse}
                  </Link>
                </SheetClose>
              </Button>
            )}
            <SheetClose asChild>
              <Link
                href="/contact"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--casa-accent-text)] transition-colors hover:text-[var(--casa-accent-text-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
              >
                {t.advice}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
