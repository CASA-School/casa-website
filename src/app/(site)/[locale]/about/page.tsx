import type { Metadata } from 'next';

import { CheckCircle2 } from 'lucide-react';

import { HeroAPhotoLed } from '@/components/heroes';
import { AccreditationLogoList } from '@/components/sections';
import { BandHeading } from '@/components/sections/band-heading';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { TextCta } from '@/components/ui/text-cta';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getSocialProofById } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Über CASA' : 'About CASA',
    description: locale === 'de'
      ? 'CASA ist eine gemeinnützige Sprachschule in Bremen. Lernen Sie unser Team, unser Leitbild und das internationale Miteinander kennen.'
      : 'Meet CASA, a non-profit language school in Bremen where people from around the world learn German, make connections and feel at home.',
    path: '/about',
    keywords: ['About CASA', 'CASA Bremen mission', 'Language school community'],
  });
}

export default async function AboutPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('about');
  const pageConfig = getPublicPageConfig('about', locale);

  // Laura, deliberately: she writes that CASA "makes justice to its name", which
  // is the claim this page's own headline makes. Picked by id, not by index.
  const communityStory = getSocialProofById('laura-medical', locale);

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unsere Schule' : 'Our School' },
  ];

  /*
   * The approved public aggregates (CLAUDE.md hard rule 1, 2026-06-17 sync) and
   * the founding year. Nothing here is counted from an operational table.
   */
  const stats = locale === 'de'
    ? [
        { value: '1983', label: 'gegründet in Bremen' },
        { value: '30.000+', label: 'Lernende haben bei uns Deutsch gelernt' },
        { value: '150+', label: 'Herkunftsländer in unseren Kursen' },
        { value: '7–80+', label: 'Jahre jung sind unsere Lernenden' },
      ]
    : [
        { value: '1983', label: 'founded in Bremen' },
        { value: '30,000+', label: 'learners have studied German with us' },
        { value: '150+', label: 'countries represented in our classes' },
        { value: '7–80+', label: 'years young: the age range of our learners' },
      ];

  const leitbild = locale === 'de'
    ? {
        eyebrow: 'CASA Leitbild',
        title: 'Miteinander reden – aufeinander zugehen',
        intro:
          'Seit 1983 kommen bei CASA Menschen aus aller Welt zusammen. Gegründet von einer Gruppe junger Pädagoginnen und Pädagogen, ist unsere gemeinnützige Sprachschule bis heute ein Ort, an dem Lernen und Begegnung zusammengehören.',
        qualityEyebrow: 'Qualität',
        qualityTitle: 'Unsere Qualitätsstandards',
        qualityIntro: 'Fünf Zusagen, an denen wir unseren Unterricht messen lassen.',
        qualityBullets: [
          'Kurse, die sich an den Bedürfnissen unserer Teilnehmenden orientieren',
          'Hohe fachliche, pädagogische und soziale Kompetenz unserer Mitarbeitenden',
          'Zeitgemäße räumliche und technische Ausstattung',
          'Erwachsenengerechte Lehr- und Lernmaterialien',
          'Regelmäßige Rückmeldungen und gemeinsame Weiterentwicklung unseres Unterrichts',
        ],
        aimsTitle: 'Unsere Ziele',
        aimsText:
          'Wir möchten, dass Sie sich auf Deutsch ausdrücken, andere verstehen und Ihren Alltag selbstständig gestalten können. Ob Studium, Beruf oder ein neuer Lebensmittelpunkt: Wir besprechen mit Ihnen, welche sprachlichen Schritte zu Ihren Plänen passen.',
        approachEyebrow: 'Mehr als Unterricht',
        approachTitle: 'Lernen durch Begegnung',
        approachText:
          'Deutsch wird lebendig, wenn Menschen miteinander sprechen. Deshalb schaffen wir auch außerhalb des Unterrichts Gelegenheiten, sich kennenzulernen, Erfahrungen zu teilen und Freundschaften zu schließen.',
        encounterBullets: [
          'Unterbringung in deutschen Gastfamilien',
          'Organisation von Tandempartnerschaften',
          'Kulturprogramm in Bremen und Ausflüge in die Region',
          'Partnerübungen und Austausch im Unterricht',
        ],
      }
    : {
        eyebrow: 'CASA mission',
        title: 'Bringing people together through language',
        intro:
          'A group of young educators founded CASA in 1983. Today, our non-profit school welcomes people from around the world. Different languages, experiences and perspectives enrich the life we share here.',
        qualityEyebrow: 'Quality',
        qualityTitle: 'Our quality standards',
        qualityIntro: 'Five commitments we hold our teaching to.',
        qualityBullets: [
          'Courses that respond to the needs of our students',
          'A team with teaching expertise and an understanding of people',
          'Well-equipped spaces for learning together',
          'Materials suited to adult learners',
          'Listening to feedback and continually improving our teaching',
        ],
        aimsTitle: 'Our aims',
        aimsText:
          'We want you to feel able to express yourself, understand others and take part in everyday life. Whether you are considering university, looking for work or moving to a new city, we help you think through the language skills and next steps you need.',
        approachEyebrow: 'Beyond the classroom',
        approachTitle: 'Learning through connection',
        approachText:
          'Language comes to life when you use it with other people. In class and beyond, we make room for conversations, shared experiences and friendships that help a new place feel familiar.',
        encounterBullets: [
          'Hosting learners with German families',
          'Organizing tandem partnerships',
          'Cultural activities in Bremen and trips further afield',
          'Creating space for partner work in class',
        ],
      };

  const tandemGuide = locale === 'de'
    ? {
        eyebrow: 'Sprachtandem',
        title: 'Zwei Sprachen, ein gemeinsames Gespräch',
        intro:
          'Im Sprachtandem lernen zwei Menschen voneinander: Sie üben Deutsch und unterstützen Ihr Gegenüber beim Lernen Ihrer Sprache. Dabei geht es auch um das Kennenlernen und den Austausch im Alltag.',
        stepsTitle: 'So funktioniert es',
        steps: [
          'Sagen Sie uns, welche Sprache Sie sprechen und welche Sie üben möchten.',
          'Wir suchen eine passende Tandempartnerin oder einen passenden Tandempartner.',
          'Sobald sich jemand Passendes findet, helfen wir Ihnen, miteinander in Kontakt zu kommen.',
        ],
        benefitsTitle: 'Warum es wirkt',
        benefits: [
          'Mehr Sprechpraxis im Alltag',
          'Mehr Sicherheit in realen Situationen',
          'Kultureller Austausch mit Menschen vor Ort',
          'Verbindung von Unterricht und echter Kommunikation',
        ],
        primaryCta: 'Tandem anfragen',
      }
    : {
        eyebrow: 'Tandem program',
        title: 'Share your language, discover another',
        intro:
          'A tandem brings two people together to practise each other’s languages. You can use your German, share your own language and get to know someone in Bremen.',
        stepsTitle: 'How it works',
        steps: [
          'Tell us which language you speak and which you would like to practise.',
          'We look for a suitable language partner.',
          'When we find a match, we help you get in touch.',
        ],
        benefitsTitle: 'Why it helps',
        benefits: [
          'More real speaking practice',
          'More confidence in everyday situations',
          'Cultural exchange with people in Bremen',
          'Stronger link between class and real communication',
        ],
        primaryCta: 'Ask about tandem',
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE SITE'S STANDARD HERO: one eyebrow, one headline, one sentence, one
        button (`ctas.slice(0, 1)`). The photograph is the CASA team in the
        courtyard (slot 55), shown at its own 3:2 because the group spans the
        frame — see `photoLibrary.heroTeam` in public-page-config.ts.
      */}
      <HeroAPhotoLed
        eyebrow={locale === 'de' ? 'Unsere Schule' : 'Our School'}
        title={locale === 'de' ? 'Ein Ort zum Lernen und Ankommen' : 'A school where you belong'}
        description={
          locale === 'de'
            ? 'Bei CASA begegnen sich Menschen aus aller Welt. Wir sind stolz auf diese Vielfalt und auf ein familiäres Miteinander, in dem Sie mit Ihren Fragen und Plänen willkommen sind.'
            : 'People from around the world make CASA what it is. We are proud of that diversity and of the close, welcoming community we build together.'
        }
        photo={pageConfig.photos.hero}
        ctas={pageConfig.ctas.slice(0, 1)}
        breadcrumbs={breadcrumbs}
      />

      {/*
        COMPOSITION, 2026-10-01. The page now uses the homepage's own grammar:
        a heading rail beside its content, alternating grounds (white, canvas,
        one ink-deep reset), and divided panels instead of cards inside cards.

        Gone, with the reason:
        - The ProofBand slab. It repeated the homepage's band directly under this
          hero; its marks moved into the quality band, where they are evidence.
        - The two-entry milestone timeline (1983, "today"). Two points are not a
          timeline; the founding year leads the figures below and the story.
        - "Persönlich begleitet". The homepage's "Wir hören zu" band says it.
        - The story block's photograph, a numbered placeholder (slot 12). The
          quote stands on its own as a pull quote.
      */}
      <section className="bg-white py-14 md:py-16" aria-label={locale === 'de' ? 'CASA in Zahlen' : 'CASA in figures'}>
        <Container>
          <dl className="mx-auto grid max-w-[85rem] grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-[color:var(--casa-sand)]">
            {stats.map((stat) => (
              <div key={stat.value} className="flex flex-col-reverse justify-end lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <dt className="mt-2 max-w-[16rem] text-sm leading-snug text-[var(--casa-muted)] md:text-base">{stat.label}</dt>
                <dd className="font-display text-4xl leading-none tracking-tight text-[var(--casa-ink)] lining-nums md:text-5xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* `#mission` is linked from the footer and from /ueber-uns/gemeinnuetzigkeit. */}
      <section id="mission" className="scroll-mt-28 py-16 md:py-24">
        <Container>
          <div className="mx-auto grid max-w-[85rem] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{leitbild.eyebrow}</p>
              <h2 className="mt-3 text-balance text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">{leitbild.title}</h2>
              <span className="casa-tricolor-rule mt-7 block h-1 w-28 rounded-full md:w-36" aria-hidden />
            </div>
            <div className="max-w-[44rem]">
              <p className="text-pretty text-lg leading-relaxed text-[var(--casa-ink)] md:text-xl">{leitbild.intro}</p>
              <h3 className="mt-10 text-xl font-bold text-[var(--casa-ink)]">{leitbild.aimsTitle}</h3>
              <p className="mt-3 text-pretty text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{leitbild.aimsText}</p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                <TextCta href="/ueber-uns/gemeinnuetzigkeit">
                  {locale === 'de' ? 'Was gemeinnützig bei uns heißt' : 'What being a non-profit means here'}
                </TextCta>
                <TextCta href="/team">
                  {locale === 'de' ? 'Das CASA-Team kennenlernen' : 'Meet the CASA team'}
                </TextCta>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/*
        The page's one dark band. `#leitbild` keeps its old anchor; `#partners`
        moved here with the accreditation marks.
      */}
      <section id="leitbild" className="scroll-mt-28 bg-[var(--casa-ink-deep)] py-20 text-white md:py-28">
        <Container>
          <div className="mx-auto max-w-[85rem]">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">{leitbild.qualityEyebrow}</p>
                <h2 className="mt-3 text-balance text-3xl font-bold leading-tight md:text-4xl">{leitbild.qualityTitle}</h2>
                <p className="mt-5 max-w-measure text-base leading-relaxed text-white/72 md:text-lg">{leitbild.qualityIntro}</p>
              </div>
              <ol className="divide-y divide-white/12 border-y border-white/12">
                {leitbild.qualityBullets.map((item, index) => (
                  <li key={item} className="flex items-baseline gap-5 py-5 md:gap-8 md:py-6">
                    {/* /60, not lower: /45 measured 4.26:1 on ink-deep, under AA for small text. */}
                    <span className="w-6 shrink-0 text-xs font-semibold tracking-eyebrow text-white/60" aria-hidden>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base leading-relaxed text-white md:text-lg">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div id="partners" className="mt-16 scroll-mt-28 md:mt-20">
              <p className="text-sm font-semibold text-white/80">
                {locale === 'de' ? 'Anerkennungen und Partnerschaften' : 'Accreditations and partnerships'}
              </p>
              <AccreditationLogoList locale={locale} className="mt-5" />
            </div>
          </div>
        </Container>
      </section>

      <section id="begegnung" className="scroll-mt-28 bg-white py-16 md:py-24">
        <Container>
          <div className="mx-auto grid max-w-[85rem] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--casa-ink-deep)] shadow-[var(--shadow-modal)]">
              <Image
                src={pageConfig.photos.mission.src}
                alt={pageConfig.photos.mission.alt}
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{leitbild.approachEyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">{leitbild.approachTitle}</h2>
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{leitbild.approachText}</p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {leitbild.encounterBullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* `#tandem` is where the old site's tandem URLs redirect (src/i18n/legacy-redirects.ts). */}
      <section id="tandem" className="scroll-mt-28 py-16 md:py-24">
        <Container>
          <BandHeading tone="light" eyebrow={tandemGuide.eyebrow} title={tandemGuide.title} description={tandemGuide.intro} />

          <div className="mx-auto mt-10 max-w-[64rem] md:mt-12">
            <h3 className="sr-only">{tandemGuide.stepsTitle}</h3>
            <ol className="grid divide-y divide-[color:var(--casa-sand)] overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] md:grid-cols-3 md:divide-x md:divide-y-0">
              {tandemGuide.steps.map((step, index) => (
                <li key={step} className="p-6 md:p-7">
                  <span className="font-display text-3xl leading-none text-[var(--casa-accent-text)] lining-nums" aria-hidden>
                    {index + 1}
                  </span>
                  <p className="mt-4 text-base leading-relaxed text-[var(--casa-ink)]">{step}</p>
                </li>
              ))}
            </ol>

            <h3 className="sr-only">{tandemGuide.benefitsTitle}</h3>
            <ul className="mx-auto mt-8 grid max-w-[46rem] gap-x-10 gap-y-3 sm:grid-cols-2">
              {tandemGuide.benefits.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--casa-muted)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 text-center">
            <TextCta href="/contact">{tandemGuide.primaryCta}</TextCta>
          </div>
        </Container>
      </section>

      {/*
        One learner's voice, as a pull quote: no photograph beside it (hard
        rule 2), and no grid of the site's other quotes, which the homepage has.
      */}
      {communityStory ? (
        <section className="bg-white py-16 md:py-24">
          <Container>
            <figure className="mx-auto max-w-[50rem] text-center">
              <span aria-hidden className="block font-display text-6xl leading-none text-[var(--casa-accent-text)]">“</span>
              <blockquote className="mt-2 text-balance font-display text-2xl leading-snug text-[var(--casa-ink)] md:text-3xl">
                {communityStory.quote}
              </blockquote>
              <figcaption className="mt-7 text-sm text-[var(--casa-muted)]">
                <span className="font-bold text-[var(--casa-ink)]">{communityStory.personDisplay}</span>
                {' · '}
                {communityStory.country}
              </figcaption>
            </figure>
          </Container>
        </section>
      ) : null}
    </main>
  );
}
