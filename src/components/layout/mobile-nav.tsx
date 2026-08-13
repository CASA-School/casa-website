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
        <Button aria-label="Open navigation menu" variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-slate-200 lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} className="w-full overflow-y-auto border-l-0 p-0 sm:max-w-md">
        <SheetTitle className="sr-only">
          {contentLocale === 'de' ? 'Mobiles Navigationsmenü' : 'Mobile navigation menu'}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {contentLocale === 'de'
            ? 'Öffnen Sie die wichtigsten Bereiche von CASA, wechseln Sie die Sprache oder gehen Sie direkt zur Anmeldung oder Kontaktaufnahme.'
            : 'Browse CASA sections, switch language, or jump directly to registration and admissions.'}
        </SheetDescription>
        <div className="flex h-full flex-col bg-white">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 p-6 backdrop-blur">
            <Link href="/" aria-label="Go to CASA homepage" className="flex items-center">
              <Logo className="h-8 w-auto" />
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
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
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
                    className="absolute right-0 top-full z-20 mt-2 min-w-[130px] rounded-xl border border-slate-200 bg-white p-2 shadow-[var(--shadow-modal)]"
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={contentLocale === 'en'}
                      data-testid="mobile-locale-option-en"
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800',
                        contentLocale === 'en' ? 'bg-slate-100' : 'hover:bg-slate-50'
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
                        'mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800',
                        contentLocale === 'de' ? 'bg-slate-100' : 'hover:bg-slate-50'
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Accordion type="single" collapsible className="w-full">
              {navConfig.main.map((item, index) => {
                const isDropdown = 'trigger' in item;
                if (isDropdown) {
                  const dropdown = item as NavDropdown;
                  return (
                    <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-50">
                      <AccordionTrigger className="py-4 text-lg font-bold text-slate-900 hover:no-underline">
                        {localizeNavText(dropdown.trigger, contentLocale)}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-6 pb-4 pl-2 pt-2">
                          {dropdown.sections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              {section.title ? (
                                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--casa-text-subtle)]">
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
                  <div key={index} className="border-b border-slate-50 py-4">
                    <SheetClose asChild>
                      <Link href={linkItem.href} className="block text-lg font-bold text-slate-900 hover:text-[var(--casa-accent-text)]">
                        {localizeNavText(linkItem.label, contentLocale)}
                      </Link>
                    </SheetClose>
                  </div>
                );
              })}
            </Accordion>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 p-6">
            <div className="grid gap-3">
              {!isRegistrationPage && (
                <Button asChild className="h-11 w-full rounded-xl bg-[var(--casa-accent-surface)] font-bold text-white">
                  <SheetClose asChild>
                    <Link href={registerHref}>{registerText}</Link>
                  </SheetClose>
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 w-full rounded-xl casa-button-outline border-slate-200 font-bold">
                <SheetClose asChild>
                  <Link href="/contact">{contentLocale === 'de' ? 'Beratung anfragen' : 'Talk to Admissions'}</Link>
                </SheetClose>
              </Button>
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
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all',
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
              'text-[15px] font-bold transition-colors',
              isActive ? 'text-[var(--casa-accent-text)]' : 'text-slate-900 group-hover:text-[var(--casa-accent-text)]'
            )}
          >
            {localizeNavText(item.label, locale)}
          </div>
          {item.description ? (
            <div className="mt-0.5 text-xs text-slate-500">{localizeNavText(item.description, locale)}</div>
          ) : null}
        </div>
      </Link>
    </SheetClose>
  );
}
