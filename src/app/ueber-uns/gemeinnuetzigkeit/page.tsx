import type { Metadata } from 'next';
import { CheckCircle2, GraduationCap, Handshake, MessageCircle, Users } from 'lucide-react';

import { HeroBEditorial } from '@/components/heroes';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Gemeinnützigkeit & Mission',
  description:
    'Wie CASA als gemeinnützige Sprachschule Kursgebühren in Bildung, Integration, Lehrkräfte und soziale Projekte reinvestiert.',
  path: '/ueber-uns/gemeinnuetzigkeit',
  keywords: [
    'CASA gemeinnützig',
    'CASA gGmbH',
    'Non-profit language school Bremen',
    'gemeinnützige Sprachschule Bremen',
  ],
});

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Gemeinnützigkeit & Mission',
  url: toAbsoluteUrl('/ueber-uns/gemeinnuetzigkeit'),
  about: {
    '@type': 'EducationalOrganization',
    name: 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH',
    legalName: 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH',
  },
};

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
          title: 'Eine Sprachschule im öffentlichen Interesse',
          description:
            'CASA ist als gemeinnützige GmbH organisiert. Unser Auftrag ist Bildung, Völkerverständigung und soziale Integration in Bremen - nicht Gewinnausschüttung.',
          ctas: [
            { label: 'Wirkung ansehen', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const },
            { label: 'Leitbild lesen', href: '/about#mission', kind: 'secondary' as const },
          ],
        },
        introTitle: 'Warum CASA eine gGmbH ist',
        introText:
          'Als gemeinnützige Sprachschule steht CASA für Deutschunterricht mit gesellschaftlichem Nutzen. Sprachkenntnisse schaffen Zugang zu Alltag, Ausbildung, Studium und Arbeit. Deshalb verbinden wir Unterricht mit Beratung, Begegnung und praktischer Orientierung in Bremen.',
        principles: [
          {
            title: 'Keine Gewinnausschüttung',
            text: 'Einnahmen werden in Unterrichtsqualität, faire Vergütung, Räume, Lernmaterialien und gemeinnützige Bildungsarbeit reinvestiert.',
          },
          {
            title: 'Bildung und Integration',
            text: 'Unser Fokus liegt auf Sprachförderung, Begegnung, Studien- und Berufswegen sowie Ankommen in der Bremer Stadtgesellschaft.',
          },
          {
            title: 'Transparente Mittelverwendung',
            text: 'Kursgebühren finanzieren den Schulbetrieb und ermöglichen ergänzende Projekte, Vergünstigungen und Unterstützungsangebote.',
          },
        ],
        fundingTitle: 'Wie Kursgebühren dem gemeinnützigen Auftrag dienen',
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
        impactTitle: 'Woran unser öffentlicher Nutzen sichtbar wird',
        impactItems: [
          'Deutschkurse für Alltag, Studium, Beruf und gesellschaftliche Teilhabe',
          'Vorbereitung auf telc Zertifikate und akademische Sprachziele',
          'Kooperationen mit Programmen für akademische und soziale Integration',
          'Tandem, Begegnung und praktische Orientierung über den Unterricht hinaus',
        ],
        projectTitle: 'Wie Gemeinnützigkeit praktisch sichtbar wird',
        projectText:
          'Die folgenden Arbeitsfelder zeigen, dass CASA nicht nur Kurse verkauft, sondern Bildungswege, Begegnung und Teilhabe in Bremen unterstützt.',
        projects: [
          {
            title: 'Here Ahead',
            label: 'Studienvorbereitung',
            icon: GraduationCap,
            text: 'Sprachliche und methodische Vorbereitung für internationale Studienbewerberinnen, Studienbewerber und Geflüchtete auf ein Fachstudium in Bremen.',
          },
          {
            title: 'Garantiefonds Hochschule',
            label: 'Geförderte Bildungswege',
            icon: Handshake,
            text: 'Anerkannte Sprachkurse für junge Zugewanderte, die ein Hochschulstudium in Deutschland aufnehmen oder fortsetzen möchten.',
          },
          {
            title: 'Tandem & Begegnung',
            label: 'Community',
            icon: MessageCircle,
            text: 'Kostenfreie Sprachpraxis, kultureller Austausch und persönliche Verbindung zwischen Deutschlernenden und Menschen in Bremen.',
          },
          {
            title: 'Ankommen in Bremen',
            label: 'Integration',
            icon: Users,
            text: 'Orientierung im Alltag, Kulturprogramme und unterstützende Lernräume verbinden Unterricht mit echter gesellschaftlicher Teilhabe.',
          },
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
          title: 'A language school serving the public interest',
          description:
            'CASA is organized as a non-profit gGmbH. Our purpose is education, intercultural understanding, and social integration in Bremen - not profit distribution.',
          ctas: [
            { label: 'See the impact', href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', kind: 'primary' as const },
            { label: 'Read our mission', href: '/about#mission', kind: 'secondary' as const },
          ],
        },
        introTitle: 'Why CASA is a gGmbH',
        introText:
          'As a non-profit language school, CASA provides German education with public benefit. Language skills open access to everyday life, training, university, and work. That is why we combine classes with advising, encounter, and practical orientation in Bremen.',
        principles: [
          {
            title: 'No profit distribution',
            text: 'Income is reinvested in teaching quality, fair pay, facilities, learning materials, and public-benefit education.',
          },
          {
            title: 'Education and integration',
            text: 'Our focus is language development, encounter, academic and work pathways, and helping people settle into Bremen society.',
          },
          {
            title: 'Transparent use of funds',
            text: 'Course fees fund school operations and support additional projects, discounts, and access where possible.',
          },
        ],
        fundingTitle: 'How course fees support the non-profit mission',
        fundingText:
          'CASA is funded substantially through course fees. These funds maintain the education program and support services that are especially important for international learners and vulnerable groups.',
        fundingBullets: [
          'Qualified teachers and pedagogical support',
          'Small, speaking-focused groups with reliable course structure',
          'Facilities, advising, and safe learning rooms in Bremen',
          'Social education projects, tandem formats, and reduced access where possible',
        ],
        legalTitle: 'Legal status and references',
        legalRows: [
          ['Legal form', 'CASA - Internationale Sprachschule Bremen gemeinnützige GmbH'],
          ['Register', 'Amtsgericht Bremen HRB 32761 HB'],
          ['Recognition', 'State-recognized independent youth welfare provider'],
          ['Tax classification', 'Recognized for promotion of public and vocational education'],
        ],
        impactTitle: 'Where public benefit becomes visible',
        impactItems: [
          'German courses for daily life, university, work, and social participation',
          'Preparation for telc certificates and academic language goals',
          'Cooperation with programs for academic and social integration',
          'Tandem, encounter, and practical orientation beyond the classroom',
        ],
        projectTitle: 'Where non-profit work becomes practical',
        projectText:
          'These fields show that CASA is not only selling courses. The school supports education pathways, encounter, and participation in Bremen.',
        projects: [
          {
            title: 'Here Ahead',
            label: 'University preparation',
            icon: GraduationCap,
            text: 'Linguistic and methodical preparation for international university applicants and refugees preparing for degree studies in Bremen.',
          },
          {
            title: 'Garantiefonds Hochschule',
            label: 'Funded education pathways',
            icon: Handshake,
            text: 'Recognized language courses for young migrants who want to begin or continue university studies in Germany.',
          },
          {
            title: 'Tandem & encounter',
            label: 'Community',
            icon: MessageCircle,
            text: 'Free speaking practice, cultural exchange, and personal connection between German learners and people in Bremen.',
          },
          {
            title: 'Settling in Bremen',
            label: 'Integration',
            icon: Users,
            text: 'Daily-life orientation, cultural programming, and supportive learning spaces connect class with real social participation.',
          },
        ],
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <JsonLdScript id="nonprofit-status-schema" data={pageSchema} />
      <HeroBEditorial
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        photo={{
          src: '/media/casa/classroom-community-table.jpg',
          alt:
            locale === 'de'
              ? 'CASA Lernende arbeiten gemeinsam an einem Tisch im Unterricht'
              : 'CASA learners working together at a classroom table',
          caption:
            locale === 'de'
              ? 'Deutschunterricht als Zugang zu Alltag, Studium und Teilhabe.'
              : 'German education as access to daily life, study, and participation.',
        }}
        ctas={copy.hero.ctas}
        breadcrumbs={copy.breadcrumbs}
        themeClassName="hero-theme-about"
      />

      {/*
        The principles are BELOW the intro, not beside it.

        They used to be three cards in the right column of an
        `lg:grid-cols-[0.82fr_1.18fr]` split, which at 1024 gave each card 167px
        — the narrowest measure anywhere on the site — for a heading plus three
        lines of body. Measured across 375/768/1024/1280/1440, that was the worst
        width in the audit. Full width gives each one 350-420px on a desktop and
        the intro keeps a readable measure instead of being squeezed to 371px.

        Cards became hairlines, matching the "four things worth knowing" band on
        /courses. Three claims of a mission statement are not UI controls, and a
        border plus a shadow on each was the elevation the design review flagged
        (§4.5) rather than a reason to look.
      */}
      <section className="border-b border-[color:var(--casa-sand)]/40 bg-white py-16 md:py-20">
        <Container className="space-y-10 md:space-y-14">
          <div className="max-w-[46rem]">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Öffentlicher Auftrag' : 'Public-benefit purpose'}
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">
              {copy.introTitle}
            </h2>
            <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {copy.introText}
            </p>
          </div>

          <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
            {copy.principles.map((principle) => (
              <li key={principle.title} className="border-t border-[color:var(--casa-sand)] pt-6">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--casa-accent-text)]"
                    aria-hidden
                  />
                  <h3 className="text-lg font-bold leading-snug text-[var(--casa-ink)]">
                    {principle.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{principle.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-b border-[color:var(--casa-sand)]/40 py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Mittelverwendung' : 'Use of funds'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {copy.fundingTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {copy.fundingText}
              </p>
              {/*
                A list, not four elevated pills. Each of these was a white
                shadowed box of `font-bold` body copy, which is two kinds of
                emphasis on a plain enumeration — bold everything and nothing
                reads as emphasised. Hairlines carry the same structure at a
                fraction of the weight.
              */}
              <ul className="mt-7 space-y-4">
                {copy.fundingBullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-t border-[color:var(--casa-sand)] pt-4 text-sm leading-relaxed text-[var(--casa-ink)]"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <section className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
              <h2 className="text-2xl font-bold text-[var(--casa-ink)]">{copy.legalTitle}</h2>
              {/*
                `minmax(9rem, …)` on the label column because a fractional one
                collapsed to 133px at 1024 and broke "Steuerliche Einordnung"
                across three lines. A floor lets the value column give up the
                width instead.
              */}
              <dl className="mt-6 divide-y divide-[color:var(--casa-sand)]/60">
                {copy.legalRows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-4 sm:grid-cols-[minmax(9rem,0.34fr)_1fr] sm:gap-5">
                    <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{label}</dt>
                    <dd className="text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </Container>
      </section>

      <section className="border-b border-[color:var(--casa-sand)]/40 bg-white py-16 md:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wirkung' : 'Impact'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {copy.impactTitle}
              </h2>
            </div>
            {/*
              One warm panel, divided — the same figure as the homepage's
              non-profit band, so the two surfaces that carry this story look
              related. Four separate tinted boxes read as four unrelated chips.
            */}
            <ul className="divide-y divide-[color:var(--casa-sand)]/70 overflow-hidden rounded-2xl bg-[var(--casa-warm-soft)]/35">
              {copy.impactItems.map((item) => (
                <li
                  key={item}
                  className="px-5 py-4 text-sm font-semibold leading-relaxed text-[var(--casa-ink)] md:px-7 md:py-5"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section id="integrationsprojekte" className="scroll-mt-28 border-b border-[color:var(--casa-sand)]/40 py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wirkung im Alltag' : 'Everyday impact'}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
                {copy.projectTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {copy.projectText}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {copy.projects.map((project) => {
                const Icon = project.icon;

                return (
                  <article
                    key={project.title}
                    className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Icon className="h-6 w-6 text-[var(--casa-accent-text)]" aria-hidden />
                      <span className="rounded-full bg-[var(--casa-warm-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
                        {project.label}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-[var(--casa-ink)]">{project.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{project.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/*
        No closing CTA band here, deliberately (2026-08-20).

        This page used to end with an ink-deep "Next step" band carrying Contact
        us and Read our mission — landing directly on top of the footer's own
        ink-panel CTA band, "Ready to start German in Bremen?", with a hairline
        between them. Two inverted bands of near-identical shape, stacked, both
        asking for the next action: the second one taught the reader that neither
        was important.

        Nothing was lost by removing it. The footer already carries the
        conversion ask on every route, and "Read our mission" is wayfinding
        rather than a call to action — it is still the hero's secondary CTA at
        the top of this page, which is where a reader looks for it.
      */}
    </main>
  );
}
