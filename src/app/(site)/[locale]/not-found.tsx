/**
 * The site's own 404, rendered inside the locale layout: `lang` on <html>, the
 * navigation and footer, and a way on from a dead link.
 *
 * The body is client-rendered. With two root layouts and a dynamic root
 * segment, Next cannot compose a 404 into the layout on the server, so the
 * server HTML is its empty error shell carrying only the 404 status, `noindex`
 * and the title; everything above appears once JS runs. e2e/smoke.spec.ts
 * asserts that raw response as well as the hydrated page.
 *
 * It catches every `notFound()` below `[locale]` — an unknown course slug, a
 * news post that is gone — and, through `[...rest]/page.tsx`, every path no
 * route claims, including `/admin` on the public host, which the proxy
 * rewrites to `/de/admin/…`. An unknown language is no exception: the proxy
 * prefixes `/fr/x` like any German path. Only a path it leaves without a
 * language (`/api/nope`) reaches the layout as `[locale]=api`; the layout
 * rejects it, and it gets Next's plain 404 body under the site's head.
 *
 * `noindex`, and no canonical, hreflang or Open Graph. Next does not reliably
 * apply a not-found file's metadata, so the guarantee is that the locale layout
 * sets none of them at all; this export only restates it.
 */

import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { Link } from '@/i18n/navigation';
import { getContentLocale } from '@/lib/content/locale.server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return {
    title: locale === 'de' ? 'Seite nicht gefunden | CASA Bremen' : 'Page not found | CASA Bremen',
    robots: { index: false, follow: true },
    alternates: null,
    openGraph: null,
    twitter: null,
  };
}

export default async function NotFound() {
  const locale = await getContentLocale();

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Fehler 404',
          title: 'Seite nicht gefunden',
          body: 'Der Link ist vielleicht veraltet, oder in der Adresse steckt ein Tippfehler. Von hier aus kommen Sie direkt weiter.',
          courses: 'Deutschkurse ansehen',
          placement: 'Einstufungstest machen',
          contact: 'Kontakt aufnehmen',
        }
      : {
          eyebrow: 'Error 404',
          title: 'Page not found',
          body: 'The link may be out of date, or the address may contain a typo. These will take you on from here.',
          courses: 'Browse German courses',
          placement: 'Take the placement test',
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
                asChild
                className="h-12 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-6 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)]"
              >
                <Link href="/courses">
                  {copy.courses}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <TextCta href="/placement-test">{copy.placement}</TextCta>
              <TextCta href="/contact">{copy.contact}</TextCta>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
