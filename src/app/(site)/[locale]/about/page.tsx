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
      ? 'CASA ist eine gemeinnützige Sprachschule in Bremen. Lerne unser Leitbild, unser Team und das internationale Miteinander bei uns kennen.'
      : 'CASA is a non-profit language school in Bremen. Get to know our mission statement, our team and the international community at our school.',
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
    { label: locale === 'de' ? 'Unsere Schule' : 'Our school' },
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
        { value: '7–80+', label: 'years young, from our youngest learners to our oldest' },
      ];

  const leitbild = locale === 'de'
    ? {
        eyebrow: 'CASA Leitbild',
        title: 'Miteinander reden – aufeinander zugehen',
        intro:
          'CASA heißt auf Deutsch „Haus“. Unsere gemeinnützige Sprachschule ist ein Ort der Begegnung, an dem Menschen unterschiedlichster Herkunft zusammenkommen und Raum finden, sich mit ihrem kulturellen Hintergrund in eine Gemeinschaft einzubringen. Gegründet wurde CASA 1983 von einer Gruppe junger Pädagoginnen und Pädagogen. Unseren Leitspruch versuchen wir jeden Tag zu leben, mit unseren Lernenden genauso wie mit unseren Kolleginnen und Kollegen und unseren Partnern.',
        qualityEyebrow: 'Qualität',
        qualityTitle: 'Unsere Qualitätsstandards',
        qualityIntro: 'Seit unserer Gründung legen wir großen Wert auf hohe Qualität. Das zeigt sich vor allem in diesen fünf Punkten.',
        qualityBullets: [
          'Unser Kursangebot ist verlässlich und aktuell.',
          'Unser Team bringt viel fachliches, pädagogisches und soziales Können mit.',
          'Unsere Räume sind gut ausgestattet, auch technisch.',
          'Wir arbeiten mit Lehr- und Lernmaterialien, die für Erwachsene geeignet sind.',
          'Wir hinterfragen unser Angebot und unsere Arbeit regelmäßig und selbstkritisch.',
        ],
        aimsTitle: 'Unsere Ziele',
        aimsText:
          'Wir haben uns auf Deutsch als Fremdsprache spezialisiert und unterrichten mit Professionalität und Leidenschaft. Gute Sprachkenntnisse sind ein Schlüssel, um in Deutschland anzukommen, im Beruf Fuß zu fassen oder an einer deutschen Universität zu studieren. Deshalb legen wir im Unterricht den Schwerpunkt darauf, die Sprache direkt im Gespräch anzuwenden. Wir möchten, dass du dich anderen gut mitteilen, deine Mitmenschen besser verstehen und deinen Alltag selbstständig gestalten kannst. Welche Schritte zu deinen Plänen passen, besprechen wir gern mit dir.',
        aimsClassText:
          'In deiner Lerngruppe soll eine gute Lernatmosphäre herrschen. Ihr erarbeitet euch neue Inhalte gemeinsam, indem ihr zusammen Aufgaben löst, und entwickelt euch im Austausch miteinander sprachlich und persönlich weiter.',
        approachEyebrow: 'Mehr als Unterricht',
        approachTitle: 'Lernen durch Begegnung',
        approachText:
          'Wir verstehen uns als Brückenbauer zwischen Menschen. Lernen ist für uns eine der schönsten Erfahrungen, und dafür braucht es ein angenehmes und anregendes Umfeld. Deshalb setzen wir auf Begegnungspädagogik.',
        encounterIntro: 'Dafür schaffen wir im Unterricht und darüber hinaus Raum für Begegnung und Austausch:',
        encounterBullets: [
          'Wohnen bei Gastfamilien in Bremen',
          'Tandempartnerschaften mit Deutschsprachigen',
          'Kulturprogramm in Bremen und Ausflüge in die Region',
          'Partnerübungen und Austausch im Unterricht',
        ],
      }
    : {
        eyebrow: 'CASA mission statement',
        title: 'Talking together, reaching out to each other',
        intro:
          'CASA means ‘house’. Our non-profit language school is a meeting place where people from all kinds of backgrounds come together and find room to bring their own culture into a community. CASA was founded in 1983 by a group of young educators. We try to live by our motto every day, with our learners just as much as with our colleagues and our partners.',
        qualityEyebrow: 'Quality',
        qualityTitle: 'Our quality standards',
        qualityIntro: 'Quality has mattered to us since we were founded, and it shows above all in these five things.',
        qualityBullets: [
          'Our range of courses is reliable and up to date.',
          'Our team are highly skilled in their subject, in teaching and in working with people.',
          'Our rooms are well equipped, technology included.',
          'We use teaching and learning materials that are suitable for adults.',
          'We regularly take a critical look at our courses and at our own work.',
        ],
        aimsTitle: 'Our aims',
        aimsText:
          'We specialise in German as a foreign language, and we teach with professionalism and passion. Good language skills are key to settling in Germany, finding your feet at work or studying at a German university. That is why our lessons focus on using the language straight away in conversation. We want you to be able to express yourself well, understand the people around you better and manage your everyday life on your own. We are happy to talk with you about the steps that suit your plans.',
        aimsClassText:
          'We want your class to have a good atmosphere for learning. You work out new material together by solving tasks as a group, and by sharing ideas with one another you grow, both in your language and as people.',
        approachEyebrow: 'Beyond the classroom',
        approachTitle: 'Learning by meeting people',
        approachText:
          'We see ourselves as bridge-builders between people. For us, learning is one of the best experiences there is, and it needs a pleasant and stimulating setting. That is why our teaching follows Begegnungspädagogik, an approach that puts meeting people at the heart of learning.',
        encounterIntro: 'So we make room for meeting and exchange, in class and beyond:',
        encounterBullets: [
          'Living with host families in Bremen',
          'Tandem partnerships with German speakers',
          'A culture programme in Bremen and trips around the region',
          'Pair work and exchange in class',
        ],
      };

  const tandemGuide = locale === 'de'
    ? {
        eyebrow: 'Sprachtandem',
        title: 'Zwei Sprachen, ein gemeinsames Gespräch',
        intro:
          'Im Sprachtandem lernen zwei Menschen voneinander. Du übst Deutsch und hilfst deinem Gegenüber beim Lernen deiner Sprache, und dabei lernt ihr euch kennen.',
        germanSpeakers:
          'Wir suchen auch deutschsprachige Tandempartnerinnen und -partner. Wenn du Deutsch sprichst und eine andere Sprache üben möchtest, melde dich gern.',
        stepsTitle: 'So funktioniert es',
        steps: [
          'Schreib uns, welche Sprache du sprichst und welche du lernen oder verbessern möchtest.',
          'Wir suchen eine passende Tandempartnerin oder einen passenden Tandempartner für dich.',
          'Sobald wir jemanden gefunden haben, melden wir uns bei dir und verabreden gemeinsam mit euch ein erstes Treffen bei uns in der Schule.',
          'Wenn ihr euch weiter treffen möchtet, tauscht ihr eure Kontaktdaten aus. Gern könnt ihr euch auch weiterhin bei uns treffen.',
        ],
        benefitsTitle: 'Was dir ein Tandem bringt',
        benefits: [
          'Du frischst deine Sprachkenntnisse auf und verbesserst sie.',
          'Du sprichst mehr und wirst im Alltag sicherer.',
          'Du lernst neue Menschen und ihre Kultur kennen.',
          'Was du im Unterricht lernst, wendest du im echten Gespräch an.',
        ],
        primaryCta: 'Tandem anfragen',
      }
    : {
        eyebrow: 'Language tandem',
        title: 'Two languages, one conversation',
        intro:
          'In a language tandem, two people learn from each other. You practise your German and help your partner learn your language, and you get to know each other along the way.',
        germanSpeakers:
          'We are also looking for German-speaking tandem partners. If you speak German and would like to practise another language, please get in touch.',
        stepsTitle: 'How it works',
        steps: [
          'Write to us and tell us which language you speak and which one you would like to learn or improve.',
          'We look for a suitable tandem partner for you.',
          'As soon as we have found someone, we get in touch and arrange a first meeting with you both here at the school.',
          'If you would like to keep meeting, you swap contact details. You are also welcome to carry on meeting at the school.',
        ],
        benefitsTitle: 'What a tandem gives you',
        benefits: [
          'You refresh and improve your language skills.',
          'You speak more and feel more confident in everyday life.',
          'You get to know new people and their culture.',
          'You use what you learn in class in real conversations.',
        ],
        primaryCta: 'Ask about a tandem',
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
        eyebrow={locale === 'de' ? 'Unsere Schule' : 'Our school'}
        title={locale === 'de' ? 'Ein Ort zum Lernen und Ankommen' : 'A place to learn and settle in'}
        description={
          locale === 'de'
            ? 'Bei CASA begegnen sich Menschen aus aller Welt. Wir sind stolz auf diese Vielfalt und auf ein familiäres Miteinander, in dem du mit deinen Fragen und Plänen willkommen bist.'
            : 'At CASA, people from all over the world come together. We are proud of this diversity and of our friendly, family atmosphere, where you are always welcome to bring your questions and plans.'
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
                <dd className="text-4xl font-black leading-none tracking-tight text-[var(--casa-ink)] md:text-5xl">{stat.value}</dd>
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
              <p className="mt-4 text-pretty text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{leitbild.aimsClassText}</p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                <TextCta href="/ueber-uns/gemeinnuetzigkeit">
                  {locale === 'de' ? 'Was gemeinnützig bei uns heißt' : 'What being a non-profit means at CASA'}
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
              {/* A lead beside the photograph (2026-10-07): the old site's whole
                  paragraph ran the column past it. The sentence about the
                  learning group is in „Unsere Ziele" above. */}
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{leitbild.approachText}</p>
              <p className="mt-6 text-sm font-semibold text-[var(--casa-ink)]">{leitbild.encounterIntro}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
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
            {/* Two by two, with hairlines from the gap: the four steps are two lines each. */}
            <ol className="grid gap-px overflow-hidden rounded-xl bg-[var(--casa-sand)] shadow-[var(--shadow-card)] sm:grid-cols-2">
              {tandemGuide.steps.map((step, index) => (
                <li key={step} className="bg-white p-6 md:p-7">
                  <span className="text-xs font-semibold tracking-eyebrow text-[var(--casa-accent-text)]" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
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

          <div className="mx-auto mt-10 max-w-[40rem] text-center">
            <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{tandemGuide.germanSpeakers}</p>
            <div className="mt-4">
              <TextCta href="/contact?topic=tandem">{tandemGuide.primaryCta}</TextCta>
            </div>
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
              <blockquote className="mt-2 text-balance text-xl font-medium leading-relaxed text-[var(--casa-ink)] md:text-2xl">
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
