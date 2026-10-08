import type { Metadata } from 'next';

import { NonprofitIncomeRing } from '@/components/sections/nonprofit-income-ring';
import { NonprofitMission } from '@/components/sections/nonprofit-mission';
import { HeroLede, HeroSurface } from '@/components/heroes/shared';
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
            'CASA ist eine gemeinnützige Sprachschule. Unsere Einnahmen aus Kursgebühren fließen zurück in Bildung, Integration, unsere Lehrkräfte und soziale Projekte.',
        }
      : {
          title: 'Non-profit status & mission',
          description:
            'CASA is a non-profit language school. Our income from course fees goes back into education, integration, our teachers and social projects.',
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
    name: 'CASA – Internationale Sprachschule gGmbH',
    legalName: 'CASA – Internationale Sprachschule gGmbH',
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
          title: 'Was gemeinnützig bei uns heißt',
          description:
            'Als gemeinnützige Sprachschule setzen wir uns für Bildung, Verständigung und Teilhabe ein. Unsere Einnahmen fließen zurück in diese Arbeit.',
          ctas: [{ label: 'Wirkung ansehen', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const }],
        },
        ring: {
          nodes: ['Qualifizierte Lehrkräfte', 'Kleine Gruppen', 'Beratung & Lernräume', 'Soziale Projekte'] as const,
          label:
            'Wohin unsere Einnahmen fließen: in qualifizierte Lehrkräfte, kleine Gruppen, Beratung und Lernräume sowie soziale Projekte.',
        },
        fundingText:
          'Wir finanzieren uns zum großen Teil über Kursgebühren. Mit diesen Einnahmen tragen wir den laufenden Schulbetrieb und sichern Angebote, die für internationale Lernende und schutzbedürftige Gruppen besonders wichtig sind.',
        fundingBullets: [
          'Qualifizierte Lehrkräfte und pädagogische Begleitung',
          'Kleine Gruppen, in denen viel gesprochen wird, und ein verlässlicher Kursablauf',
          'Ausstattung, Beratung und sichere Lernräume in Bremen',
          'Soziale Bildungsprojekte, Sprachtandems und, wo es möglich ist, ermäßigte Gebühren',
        ],
        legalTitle: 'Rechtsform und Nachweise',
        legalRows: [
          ['Rechtsform', 'CASA – Internationale Sprachschule gGmbH'],
          ['Register', 'Amtsgericht Bremen HRB 32761 HB'],
          ['Anerkennung', 'Staatlich anerkannter Träger der freien Jugendhilfe'],
          ['Steuerliche Einordnung', 'Anerkennung wegen Förderung der Volks- und Berufsbildung'],
        ],
      }
    : {
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Our school', href: '/about' },
          { label: 'Non-profit status' },
        ],
        hero: {
          eyebrow: 'Non-profit status & mission',
          title: 'What being a non-profit means at CASA',
          description:
            'As a non-profit language school, we are committed to education, understanding and inclusion. Our income goes back into this work.',
          ctas: [{ label: 'See the impact', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const }],
        },
        ring: {
          nodes: ['Qualified teachers', 'Small groups', 'Advice & places to learn', 'Social projects'] as const,
          label: 'Where our income goes: qualified teachers, small groups, advice and places to learn, and social projects.',
        },
        fundingText:
          'We are funded largely through course fees. This income pays for the day-to-day running of the school and secures services that are especially important to international learners and vulnerable groups.',
        fundingBullets: [
          'Qualified teachers and educational guidance',
          'Small groups where there is plenty of speaking, and courses that run reliably',
          'Facilities, advice and safe places to learn in Bremen',
          'Social education projects, language tandems and, where possible, reduced fees',
        ],
        legalTitle: 'Legal form and recognition',
        legalRows: [
          ['Legal form', 'CASA – Internationale Sprachschule gGmbH'],
          ['Commercial register', 'Amtsgericht Bremen HRB 32761 HB'],
          ['Recognition', 'A state-recognised independent youth welfare provider'],
          ['Tax status', 'Recognised for promoting adult education and vocational training'],
        ],
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <JsonLdScript id="nonprofit-status-schema" data={pageSchema(locale)} />
      {/*
        The hero's media slot holds the income ring from the CASA film instead of a
        photograph (Rahman, 2026-10-08): on this page the picture to show is where
        the money goes. Same composition as HeroAPhotoLed (HeroSurface + HeroLede),
        with the ring where HeroBleedPhoto would be. The photo it replaced, slot 79,
        stays in the library unused.
      */}
      <HeroSurface themeClassName="hero-theme-plain" archetype="A" breadcrumbs={copy.breadcrumbs} className="overflow-x-clip">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
          <HeroLede
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
            ctas={copy.hero.ctas}
            className="lg:py-6"
          />
          <NonprofitIncomeRing nodes={copy.ring.nodes} label={copy.ring.label} />
        </div>
      </HeroSurface>

      {/*
        The gGmbH comes first (CASA, 2026-10-05): what happens to course fees and
        the legal facts, then the mission. The partners have their own page.
      */}
      <section className="bg-[var(--casa-bg)] py-14 md:py-20" aria-labelledby="nonprofit-transparency-title">
        <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{locale === 'de' ? 'Gemeinnützigkeit & Transparenz' : 'Non-profit status & transparency'}</p>
            <h2 id="nonprofit-transparency-title" className="mt-3 text-3xl font-bold">{locale === 'de' ? 'Deine Kursgebühren bleiben in der Bildungsarbeit.' : 'Your course fees go back into our educational work.'}</h2>
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

      <NonprofitMission locale={locale} />

    </main>
  );
}
