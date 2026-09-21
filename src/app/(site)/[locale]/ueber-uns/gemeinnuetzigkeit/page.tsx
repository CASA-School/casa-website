import type { Metadata } from 'next';

import { NonprofitPartnerships } from '@/components/sections/nonprofit-partnerships';
import { HeroAPhotoLed } from '@/components/heroes';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import type { ContentLocale } from '@/lib/content/types';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

const PATH = '/ueber-uns/gemeinnuetzigkeit';
const KEYWORDS = [
  'CASA gemeinnützig',
  'CASA gGmbH',
  'Non-profit language school Bremen',
  'gemeinnützige Sprachschule Bremen',
];

// Title and description follow the visitor's language like the rest of the page.
// They were German for everyone, so an English visitor got a German tab title and
// search preview on this one route.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    path: PATH,
    keywords: KEYWORDS,
    ...(locale === 'de'
      ? {
          title: 'Gemeinnützigkeit & Mission',
          description:
            'Wie CASA als gemeinnützige Sprachschule Kursgebühren in Bildung, Integration, Lehrkräfte und soziale Projekte reinvestiert.',
        }
      : {
          title: 'Non-profit status & mission',
          description:
            'How CASA, a non-profit language school, reinvests course fees in education, integration, teachers and social projects.',
        }),
  });
}

const pageSchema = (locale: ContentLocale) => ({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: locale === 'de' ? 'Gemeinnützigkeit & Mission' : 'Non-profit status & mission',
  url: toAbsoluteUrl(PATH),
  about: {
    '@type': 'EducationalOrganization',
    name: 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH',
    legalName: 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH',
  },
});

export default async function NonProfitStatusPage() {
  const locale = await getContentLocale();

  const copy = locale === 'de'
    ? {
        breadcrumbs: [
          { label: 'Start', href: '/' },
          { label: 'Unsere Schule', href: '/about' },
          { label: 'Gemeinnützigkeit' },
        ],
        hero: {
          eyebrow: 'Gemeinnützigkeit & Mission',
          title: 'Sprache verbindet. Bildung eröffnet Wege.',
          description:
            'Als gemeinnützige Sprachschule setzen wir uns für Bildung, Verständigung und Teilhabe ein. Unsere Einnahmen fließen zurück in diese Arbeit.',
          ctas: [{ label: 'Wirkung ansehen', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const }],
        },
        fundingText:
          'CASA finanziert sich wesentlich über Kursgebühren. Diese Einnahmen tragen den laufenden Bildungsbetrieb und sichern Angebote, die für internationale Lernende und schutzbedürftige Gruppen besonders wichtig sind.',
        fundingBullets: [
          'Qualifizierte Lehrkräfte und pädagogische Begleitung',
          'Kleine, sprechaktive Gruppen mit zuverlässiger Kursstruktur',
          'Ausstattung, Beratung und sichere Lernräume in Bremen',
          'Soziale Bildungsprojekte, Tandemangebote und vergünstigte Zugänge, wo möglich',
        ],
        legalTitle: 'Rechtsform und Nachweise',
        legalRows: [
          ['Rechtsform', 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH'],
          ['Register', 'Amtsgericht Bremen HRB 32761 HB'],
          ['Anerkennung', 'Staatlich anerkannter Träger der freien Jugendhilfe'],
          ['Steuerliche Einordnung', 'Anerkennung wegen Förderung der Volks- und Berufsbildung'],
        ],
      }
    : {
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Our School', href: '/about' },
          { label: 'Non-profit status' },
        ],
        hero: {
          eyebrow: 'Non-profit status & mission',
          title: 'Language brings people together',
          description:
            'As a non-profit language school, we help people learn, understand one another and take part in life in Bremen. Our income goes back into that work.',
          ctas: [{ label: 'See the impact', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const }],
        },
        fundingText:
          'CASA is funded substantially through course fees. These funds maintain the education program and support services that are especially important for international learners and vulnerable groups.',
        fundingBullets: [
          'Qualified teachers and pedagogical support',
          'Small, speaking-focused groups with reliable course structure',
          'Facilities, advising, and safe learning rooms in Bremen',
          'Educational projects, language exchange and reduced fees where possible',
        ],
        legalTitle: 'Legal status and references',
        legalRows: [
          ['Legal form', 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH'],
          ['Register', 'Amtsgericht Bremen HRB 32761 HB'],
          ['Recognition', 'State-recognized independent youth welfare provider'],
          ['Tax classification', 'Recognized for promotion of public and vocational education'],
        ],
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <JsonLdScript id="nonprofit-status-schema" data={pageSchema(locale)} />
      <HeroAPhotoLed
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        photo={{
          src: '/media/casa/classroom-community-table.jpg',
          alt:
            locale === 'de'
              ? 'CASA Lernende arbeiten gemeinsam an einem Tisch im Unterricht'
              : 'CASA learners working together at a classroom table',
        }}
        ctas={copy.hero.ctas}
        breadcrumbs={copy.breadcrumbs}
      />

      <NonprofitPartnerships locale={locale} />

      <section className="border-t border-[color:var(--casa-sand)] bg-[var(--casa-bg)] py-14 md:py-20" aria-labelledby="nonprofit-transparency-title">
        <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{locale === 'de' ? 'Gemeinnützigkeit & Transparenz' : 'Non-profit status & transparency'}</p>
            <h2 id="nonprofit-transparency-title" className="mt-3 text-3xl font-bold">{locale === 'de' ? 'Ihre Kursgebühren bleiben in der Bildungsarbeit.' : 'Your course fees support our educational work.'}</h2>
            <p className="mt-5 leading-relaxed text-[var(--casa-muted)]">{copy.fundingText}</p>
            <p className="mt-4 font-semibold leading-relaxed">{locale === 'de' ? 'Es werden keine Gewinne ausgeschüttet. Unsere Einnahmen fließen in den Schulbetrieb und die gemeinnützigen Aufgaben von CASA zurück.' : 'Profits are not distributed. Our income is reinvested in running the school and fulfilling CASA’s non-profit purpose.'}</p>
            <ul className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">{copy.fundingBullets.map(item => <li key={item} className="border-l-2 border-[var(--casa-blue)]/30 pl-4 text-sm leading-relaxed text-[var(--casa-muted)]">{item}</li>)}</ul>
          </div>
          <aside className="lg:border-l lg:border-[color:var(--casa-sand)] lg:pl-10" aria-labelledby="nonprofit-legal-title">
            <h3 id="nonprofit-legal-title" className="text-xl font-bold">{copy.legalTitle}</h3>
            <dl className="mt-5 divide-y divide-[color:var(--casa-sand)]">
              {copy.legalRows.map(([label, value]) => (
                <div key={label} className="py-4 first:pt-0">
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{label}</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </Container>
      </section>
    </main>
  );
}
