'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Globe, Menu, X } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { iconMap } from '@/config/icon-map';
import { localizeNavText, navConfig, NavDropdown, NavItem } from '@/config/nav';
import { CONTENT_LOCALE_COOKIE } from '@/lib/content/locale';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

type MobileNavProps = {
  /** Resolved on the server — see the note in Navbar about hydration. */
  contentLocale: ContentLocale;
};

export function MobileNav({ contentLocale: initialContentLocale }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [contentLocale, setContentLocale] = useState<ContentLocale>(initialContentLocale);

  useEffect(() => {
    setContentLocale(initialContentLocale);
  }, [initialContentLocale]);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);

  const isCurrent = useCallback(
    (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`)),
    [pathname]
  );

  const openSection = navConfig.main.reduce<string | undefined>((match, item, index) => {
    if (match) return match;
    if (!('trigger' in item)) return match;
    const dropdown = item as NavDropdown;
    const hit =
      (dropdown.href && isCurrent(dropdown.href)) ||
      dropdown.sections.some((section) => section.items.some((sub) => isCurrent(sub.href)));
    return hit ? `item-${index}` : match;
  }, undefined);

  const isExamContext = pathname === '/registration/exam' || pathname === '/exams' || pathname?.startsWith('/exams/');
  const isRegistrationPage = pathname?.startsWith('/registration');
  const registerHref = isExamContext ? '/registration/exam' : '/registration/course';
  const registerText = isExamContext
    ? (contentLocale === 'de' ? 'Zur Prüfungsanmeldung' : 'Register for Exam')
    : (contentLocale === 'de' ? 'Zur Kursanmeldung' : 'Register Now');

  const switchContentLocale = useCallback(
    (locale: ContentLocale) => {
      setIsLocaleMenuOpen(false);
      setContentLocale(locale);
      document.cookie = `${CONTENT_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router]
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open navigation menu" variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-[color:var(--casa-sand)] xl:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      {/*
        Full viewport, not a 448px drawer.

        `sm:max-w-md` capped the panel at 28rem, so on a tablet the menu was a
        narrow column pinned to one edge with two thirds of the screen dimmed
        behind it — the least useful shape available, since that is exactly the
        width where there is room to show structure. It now takes the whole
        viewport at every size and lays its sections out in columns once there
        is room for them.
      */}
      <SheetContent side="right" showCloseButton={false} className="w-full max-w-none overflow-y-auto border-l-0 p-0 sm:max-w-none">
        <SheetTitle className="sr-only">
          {contentLocale === 'de' ? 'Mobiles Navigationsmenü' : 'Mobile navigation menu'}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {contentLocale === 'de'
            ? 'Öffnen Sie die wichtigsten Bereiche von CASA, wechseln Sie die Sprache oder gehen Sie direkt zur Anmeldung oder Kontaktaufnahme.'
            : 'Browse CASA sections, switch language, or jump directly to registration and admissions.'}
        </SheetDescription>
        <div className="flex h-full flex-col bg-white">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--casa-sand)]/70 bg-white/95 p-6 backdrop-blur">
            <Link href="/" aria-label="Go to CASA homepage" className="flex items-center">
              <Logo className="h-9 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  data-testid="mobile-locale-trigger"
                  aria-haspopup="menu"
                  aria-expanded={isLocaleMenuOpen}
                  aria-controls="mobile-locale-menu"
                  aria-label={`Select content language, current ${contentLocale === 'de' ? 'Deutsch' : 'English'}`}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[color:var(--casa-sand)] px-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                  onClick={() => setIsLocaleMenuOpen((isOpen) => !isOpen)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsLocaleMenuOpen(false);
                    }
                  }}
                >
                  <Globe className="h-4 w-4" />
                  {contentLocale}
                </button>
                {isLocaleMenuOpen ? (
                  <div
                    id="mobile-locale-menu"
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-2 min-w-[130px] rounded-xl border border-[color:var(--casa-sand)] bg-white p-2 shadow-[var(--shadow-modal)]"
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={contentLocale === 'en'}
                      data-testid="mobile-locale-option-en"
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--casa-ink)]',
                        contentLocale === 'en' ? 'bg-[var(--casa-surface-subtle)]' : 'hover:bg-[var(--casa-canvas)]'
                      )}
                      onClick={() => switchContentLocale('en')}
                    >
                      <Check className={cn('h-3.5 w-3.5', contentLocale === 'en' ? 'opacity-100' : 'opacity-0')} />
                      English
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={contentLocale === 'de'}
                      data-testid="mobile-locale-option-de"
                      className={cn(
                        'mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--casa-ink)]',
                        contentLocale === 'de' ? 'bg-[var(--casa-surface-subtle)]' : 'hover:bg-[var(--casa-canvas)]'
                      )}
                      onClick={() => switchContentLocale('de')}
                    >
                      <Check className={cn('h-3.5 w-3.5', contentLocale === 'de' ? 'opacity-100' : 'opacity-0')} />
                      Deutsch
                    </button>
                  </div>
                ) : null}
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label={contentLocale === 'de' ? 'Navigation schließen' : 'Close navigation menu'}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </div>
          </div>

          {/*
            The drawer used to open with every section collapsed, even when the
            visitor was already inside one — so arriving from /courses/evening-course
            and opening the menu showed no indication of where they were, and
            reaching a sibling course took an extra tap.

            `openSection` resolves the dropdown whose own href or any of whose
            items matches the current path, and hands it to the accordion as its
            default. Computed during render from `pathname`, so it follows client
            navigation without an effect.
          */}
          <div className="mx-auto w-full max-w-[64rem] flex-1 overflow-y-auto p-6 sm:p-8">
            <Accordion type="single" collapsible className="w-full" defaultValue={openSection}>
              {navConfig.main.map((item, index) => {
                const isDropdown = 'trigger' in item;
                if (isDropdown) {
                  const dropdown = item as NavDropdown;
                  return (
                    <AccordionItem key={index} value={`item-${index}`} className="border-b border-[color:var(--casa-sand)]/40">
                      <AccordionTrigger
                        className={cn(
                          'font-display py-4 text-lg font-semibold hover:no-underline',
                          openSection === `item-${index}`
                            ? 'text-[var(--casa-accent-text)]'
                            : 'text-[var(--casa-ink)]'
                        )}
                      >
                        {localizeNavText(dropdown.trigger, contentLocale)}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-6 pb-4 pl-2 pt-2">
                          {dropdown.sections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              {section.title ? (
                                <p className="mb-4 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                                  {localizeNavText(section.title, contentLocale)}
                                </p>
                              ) : null}
                              <div className="flex flex-col gap-5">
                                {section.items.map((subItem) => (
                                  <MobileLink
                                    key={subItem.href}
                                    item={subItem}
                                    locale={contentLocale}
                                    isActive={!!pathname && (pathname === subItem.href || pathname.startsWith(`${subItem.href}/`))}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }

                const linkItem = item as NavItem;
                return (
                  <div key={index} className="border-b border-[color:var(--casa-sand)]/40 py-4">
                    <SheetClose asChild>
                      <Link
                        href={linkItem.href}
                        aria-current={isCurrent(linkItem.href) ? 'page' : undefined}
                        className={cn(
                          'font-display block text-lg font-semibold hover:text-[var(--casa-accent-text)]',
                          isCurrent(linkItem.href)
                            ? 'text-[var(--casa-accent-text)]'
                            : 'text-[var(--casa-ink)]'
                        )}
                      >
                        {localizeNavText(linkItem.label, contentLocale)}
                      </Link>
                    </SheetClose>
                  </div>
                );
              })}
            </Accordion>
          </div>

          {/*
            One button, one text link — not two stacked full-width buttons.
            Both were rendered at the same width and weight, so the drawer
            closed on a coin toss between them. Registration is the action the
            filled control is for; admissions is a question, and a question
            reads correctly as a link.
          */}
          <div className="border-t border-[color:var(--casa-sand)]/70 bg-[var(--casa-canvas)]/50 p-6">
            <div className="grid gap-4">
              {!isRegistrationPage && (
                <Button asChild className="h-11 w-full rounded-lg bg-[var(--casa-accent-surface)] font-bold text-white">
                  <SheetClose asChild>
                    <Link href={registerHref}>{registerText}</Link>
                  </SheetClose>
                </Button>
              )}
              <SheetClose asChild>
                <Link
                  href="/contact"
                  className="casa-cta-link inline-flex items-center justify-center gap-2 py-1 text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:underline"
                >
                  {contentLocale === 'de' ? 'Beratung anfragen' : 'Talk to Admissions'}
                  <svg aria-hidden="true" viewBox="0 0 22 8" fill="none" className="h-2 w-[20px] shrink-0">
                    <path
                      d="M0 4h20M16.5 0.6L20.4 4l-3.9 3.4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileLink({ item, locale, isActive }: { item: NavItem; locale: ContentLocale; isActive: boolean }) {
  const Icon = item.icon ? iconMap[item.icon] : null;
  return (
    <SheetClose asChild>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className="group flex items-center gap-4 rounded-xl p-0.5"
      >
        {Icon ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-surface-subtle)] text-[var(--casa-muted)] transition-all',
              isActive
                ? 'bg-[var(--casa-accent-surface)] text-white'
                : 'group-hover:bg-[var(--casa-accent-surface)] group-hover:text-white'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <div
            className={cn(
              'text-sm font-bold transition-colors',
              isActive ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]'
            )}
          >
            {localizeNavText(item.label, locale)}
          </div>
          {item.description ? (
            <div className="mt-0.5 text-xs text-[var(--casa-muted)]">{localizeNavText(item.description, locale)}</div>
          ) : null}
        </div>
      </Link>
    </SheetClose>
  );
}
