import { ArrowRight } from 'lucide-react';

import { PartnerLogoTile } from './partner-logo-tile';
import { Container } from '@/components/ui/container';
import { partners } from '@/config/content/partners';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { say } from '@/lib/cms/copy';

/**
 * The public-benefit mission, with the partners as a pointer to their page.
 *
 * Until 2026-10-05 this section carried the partners in full: tabs for HERE
 * AHEAD, :prime and the Garantiefonds Hochschule, then a band of TANDEM
 * schools. They have their own page now (/partners), so this page keeps to the
 * gGmbH (CASA, 2026-10-05): the mission text stays, the partners shrink to
 * their logos and one link. The `#integrationsprojekte` anchor stays because
 * the hero, the website assistant and older links point at it.
 */
export function NonprofitMission({ locale }: { locale: ContentLocale }) {

  return (
    <section id="integrationsprojekte" className="scroll-mt-28 py-16 md:py-24" aria-labelledby="nonprofit-mission-title">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {say(locale, 'Unser gesellschaftlicher Auftrag', 'Our public-benefit mission')}
          </p>
          <h2 id="nonprofit-mission-title" className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            {say(locale, 'Gemeinnützig für Bildung und Teilhabe', 'A non-profit for education and inclusion')}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[var(--casa-ink)]">
            {say(locale, 'Als gemeinnützige Sprachschule verbinden wir Deutschunterricht mit Beratung und Begegnung. Sprachkenntnisse eröffnen Wege in den Alltag, in Ausbildung, Studium und Beruf.', 'As a non-profit language school, we combine German teaching with advice and opportunities to meet people. Language skills open the way into everyday life, vocational training, university and work.')}
          </p>
          <p className="mt-4 leading-relaxed text-[var(--casa-muted)]">
            {say(locale, 'Wir begleiten internationale Lernende und Menschen, die in Bremen neu anfangen. Unsere Bildungskooperationen helfen auf dem Weg ins Studium. Kostenfreie Sprachtandems, Ausflüge und Begegnungen schaffen Verbindungen im Alltag.', 'We support international learners and people who are making a new start in Bremen. Our education partnerships help them on the way to university. Free language tandems, outings and get-togethers create connections in everyday life.')}
          </p>
        </div>

        <div className="rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-6 sm:p-8">
          <h3 className="text-xl font-bold text-[var(--casa-ink)]">{say(locale, 'Unsere Kooperationspartner', 'Our cooperation partners')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">
            {say(locale, 'Mit diesen Organisationen arbeiten wir in Bremen und darüber hinaus zusammen.', 'These are the organisations we work with, in Bremen and beyond.')}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={say(locale, 'Kooperationspartner', 'Cooperation partners')}>
            {partners.map((partner) => (
              <li key={partner.id}>
                <PartnerLogoTile partner={partner} size="sm" />
              </li>
            ))}
          </ul>
          <Link
            href="/partners"
            className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]"
          >
            {say(locale, 'Alle Kooperationspartner ansehen', 'See all cooperation partners')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
