import type { ReactNode } from 'react';

import { ContactHelpPanel } from '@/components/forms/contact-help-panel';
import { formCardClassName } from '@/components/forms/form-styles';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { say } from '@/lib/cms/copy';

type RegistrationPageShellProps = {
  locale: ContentLocale;
  title: string;
  intro: string;
  /** The wizard card's id, the target of "register" links that scroll to the form. */
  formId: string;
  helpTitle: string;
  helpBody: string;
  children: ReactNode;
};

/**
 * The frame of both registration pages, built like the contact page: title and
 * one line, the form on its white card, the office beside it.
 */
export function RegistrationPageShell({ locale, title, intro, formId, helpTitle, helpBody, children }: RegistrationPageShellProps) {
  const breadcrumbs = [
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: title },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <section className="pb-14 pt-6 md:pb-20 md:pt-8">
        <Container>
          <Breadcrumbs items={breadcrumbs} />
          <header className="mt-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">{title}</h1>
            <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{intro}</p>
          </header>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:gap-8">
            <div id={formId} className={cn(formCardClassName, 'relative scroll-mt-28')}>
              {children}
            </div>
            <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <ContactHelpPanel locale={locale} title={helpTitle} body={helpBody} />
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
