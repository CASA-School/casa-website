'use client';

/**
 * The site's error boundary: a page that throws while rendering shows this
 * inside the locale layout, in the page's language, instead of Next's default
 * screen. `retry` re-fetches and re-renders the segment. It does not cover the
 * layout itself, which has nothing above it but Next.
 */

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { useLocaleFromPath } from '@/i18n/navigation';

export default function SiteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = useLocaleFromPath();

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Fehler',
          title: 'Etwas ist schiefgelaufen',
          body: 'Diese Seite konnte gerade nicht geladen werden. Bitte versuchen Sie es noch einmal. Wenn der Fehler bleibt, erreichen Sie uns über die Kontaktseite.',
          retry: 'Erneut versuchen',
          home: 'Zur Startseite',
          contact: 'Kontakt aufnehmen',
        }
      : {
          eyebrow: 'Error',
          title: 'Something went wrong',
          body: 'This page could not be loaded just now. Please try again. If it keeps happening, you can reach us through the contact page.',
          retry: 'Try again',
          home: 'Go to the home page',
          contact: 'Contact us',
        };

  return (
    <main className="flex-1 bg-white text-[var(--casa-ink)]">
      <section className="py-16 md:py-24">
        <Container>
          <div className="max-w-measure">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {copy.eyebrow}
            </p>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{copy.body}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
              <Button
                type="button"
                onClick={() => retry()}
                className="h-12 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-6 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)]"
              >
                {copy.retry}
              </Button>
              <TextCta href="/">{copy.home}</TextCta>
              <TextCta href="/contact">{copy.contact}</TextCta>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
