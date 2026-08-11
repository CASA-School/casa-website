import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, GraduationCap, Handshake, MessageCircle, Users } from 'lucide-react';

import { HeroBEditorial } from '@/components/heroes';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
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
        ctaTitle: 'Unsere gemeinnützige Arbeit praktisch erleben',
        ctaText:
          'Unsere Mission zeigt sich in Unterricht, Beratung, Begegnung und konkreten Wegen in Studium, Alltag und Stadtgesellschaft.',
        ctaPrimary: 'Kontakt aufnehmen',
        ctaSecondary: 'Leitbild lesen',
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
        ctaTitle: 'See the mission in practice',
        ctaText:
          'The mission becomes visible through teaching, advising, encounter, and practical pathways into university, daily life, and city society.',
        ctaPrimary: 'Contact us',
        ctaSecondary: 'Read our mission',
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

      <section className="border-b border-[color:var(--casa-sand)]/40 bg-white py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Öffentlicher Auftrag' : 'Public-benefit purpose'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
                {copy.introTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {copy.introText}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {copy.principles.map((principle) => (
                <article
                  key={principle.title}
                  className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)]"
                >
                  <CheckCircle2 className="h-5 w-5 text-[var(--casa-accent-text)]" aria-hidden />
                  <h3 className="mt-4 text-lg font-black text-[var(--casa-ink)]">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{principle.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[color:var(--casa-sand)]/40 bg-slate-50/45 py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Mittelverwendung' : 'Use of funds'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
                {copy.fundingTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {copy.fundingText}
              </p>
              <ul className="mt-6 grid gap-3">
                {copy.fundingBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[var(--casa-ink)] shadow-[var(--shadow-soft)]">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--casa-amber-strong)]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <section className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
              <h2 className="text-2xl font-black text-[var(--casa-ink)]">{copy.legalTitle}</h2>
              <dl className="mt-6 divide-y divide-[color:var(--casa-sand)]/60">
                {copy.legalRows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-4 sm:grid-cols-[0.36fr_0.64fr] sm:gap-4">
                    <dt className="text-xs font-black uppercase tracking-[0.1em] text-[var(--casa-muted)]">{label}</dt>
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
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wirkung' : 'Impact'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
                {copy.impactTitle}
              </h2>
            </div>
            <ul className="grid gap-4 md:grid-cols-2">
              {copy.impactItems.map((item) => (
                <li key={item} className="rounded-lg bg-[var(--casa-warm-soft)]/28 p-5 text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section id="integrationsprojekte" className="scroll-mt-28 border-b border-[color:var(--casa-sand)]/40 bg-slate-50/45 py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                {locale === 'de' ? 'Wirkung im Alltag' : 'Everyday impact'}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
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
                      <span className="rounded-full bg-[var(--casa-warm-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--casa-ink)]">
                        {project.label}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-black text-[var(--casa-ink)]">{project.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{project.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--casa-ink-deep)] py-14 text-white md:py-16">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-sun)]">
                {locale === 'de' ? 'Nächster Schritt' : 'Next step'}
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{copy.ctaTitle}</h2>
              <p className="mt-3 text-base leading-relaxed text-white/72">{copy.ctaText}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="marketing-sun">
                <Link href="/contact">
                  {copy.ctaPrimary}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" className="casa-button-outline border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/about#mission">{copy.ctaSecondary}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
