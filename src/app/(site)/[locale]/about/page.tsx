import type { Metadata } from 'next';

import { HeroAPhotoLed } from '@/components/heroes';
import { EditorialSplit, HumanStoryBlock, ProofBand } from '@/components/sections';
import { AboutMilestones } from '@/components/signatures';
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

  const leitbild = locale === 'de'
    ? {
        eyebrow: 'CASA Leitbild',
        title: 'Miteinander reden – aufeinander zugehen',
        intro:
          'Seit 1983 kommen bei CASA Menschen aus aller Welt zusammen. Gegründet von einer Gruppe junger Pädagoginnen und Pädagogen, ist unsere gemeinnützige Sprachschule bis heute ein Ort, an dem Lernen und Begegnung zusammengehören.',
        qualityTitle: 'Unsere Qualitätsstandards',
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
        qualityTitle: 'Our quality standards',
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
        secondaryCta: 'Team kontaktieren',
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
        secondaryCta: 'Contact our team',
      };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE SITE'S STANDARD HERO. This was HeroBEditorial, which wrote its own h1
        at `text-5xl font-black` — 51.2px at weight 900 against the homepage's
        64px at 700 — and put the photograph in a bordered card beside the copy.
        `public-page-config.ts` has said `heroType: 'home-photo'` for this route
        all along; the page just never rendered it.

        No fact rail, and one control rather than two. The proof metrics that
        used to be passed here went to a prop HeroBEditorial accepted and never
        rendered — they have been in the ProofBand section immediately below the
        whole time — and `pageConfig.ctas`' second entry ("Find my course path")
        rendered as a text link beside the button. `.slice(0, 1)` is the hero's
        stated rule: one eyebrow, one headline, one sentence, one button.

        No photo caption: a caption needs an edge to sit under, and a photograph
        masked into the ground has none. The alt text still describes the scene.

        The photograph itself moved — see the note on `about.photos.hero` in
        public-page-config.ts. The community-story block below keeps the one
        this hero used to render, under its own `story` key.
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

      {/* Section 1: Proof Band */}
      <section id="partners" className="py-16 md:py-20 bg-white scroll-mt-28">
        <Container>
          <ProofBand
            locale={locale}
            title={locale === 'de' ? 'Qualität und Partnerschaften' : 'Quality and partnerships'}
            credibilityLine={
              locale === 'de'
                ? 'Unsere Bildungsarbeit wird durch langjährige Erfahrung und verlässliche Partnerschaften getragen.'
                : 'Long-standing experience and trusted partnerships support our work.'
            }
          />
        </Container>
      </section>

      {/* Section 2: Milestones */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <AboutMilestones
            title={locale === 'de' ? 'CASA Meilensteine seit 1983' : 'CASA milestones since 1983'}
            description={
              locale === 'de'
                ? 'Wie sich CASA als internationale Sprachschule in Bremen entwickelt hat.'
                : 'How CASA has evolved as an international language school in Bremen.'
            }
            milestones={[
              {
                label: '1983',
                title: locale === 'de' ? 'Gründung in Bremen' : 'Founded in Bremen',
                description:
                  locale === 'de'
                    ? 'Eine Gruppe junger Pädagoginnen und Pädagogen gründet CASA.'
                    : 'A group of young educators establishes CASA in Bremen.',
              },
              {
                label: locale === 'de' ? 'Heute' : 'Today',
                title: locale === 'de' ? 'Lernen und Leben verbinden' : 'Learning and life together',
                description:
                  locale === 'de'
                    ? 'Deutschkurse, Prüfungen, Unterkunft und persönliche Beratung begleiten Menschen auf ihrem Weg.'
                    : 'German courses, exams, accommodation and personal advice support people as they build their lives here.',
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 3: Mission */}
      <section id="mission" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white scroll-mt-28">
        <Container>
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Persönlich begleitet' : 'Here for you'}
            title={locale === 'de' ? 'Zeit für Ihre Fragen und Ihre Ziele' : 'We take time to get to know you'}
            description={
              locale === 'de'
                ? 'Wir hören zu, bevor wir etwas empfehlen. Im persönlichen Gespräch geht es um Ihre Vorkenntnisse, Ihren Alltag und das, was Sie erreichen möchten.'
                : 'We listen before we recommend. A one-to-one conversation helps us understand your experience, your everyday commitments and what you hope to achieve.'
            }
            bullets={[
              locale === 'de' ? 'Kleine Lerngruppen für mehr Sprechzeit' : 'Small groups for more speaking time',
              locale === 'de' ? 'Lehrkräfte mit persönlichem Feedback' : 'Teachers who provide personal feedback',
              locale === 'de' ? 'Gemeinsame Aktivitäten, bei denen Sie neue Menschen kennenlernen' : 'Shared activities that help you meet people and settle in',
            ]}
            photo={{
              ...pageConfig.photos.mission,
              caption: pageConfig.photos.mission.caption,
            }}
          />
        </Container>
      </section>

      {/* Section 4: Leitbild */}
      <section id="leitbild" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 scroll-mt-28">
        <Container>
          <article className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-white p-6 shadow-[var(--shadow-card)] md:p-10">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{leitbild.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] md:text-3xl">{leitbild.title}</h2>
            <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{leitbild.intro}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-xl bg-[var(--casa-surface-wash)] p-5">
                <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.qualityTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--casa-muted)]">
                  {leitbild.qualityBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl bg-[var(--casa-surface-wash)] p-5">
                <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.approachTitle}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{leitbild.approachText}</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--casa-muted)]">
                  {leitbild.encounterBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-amber-strong)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-4 rounded-xl bg-[var(--casa-warm-soft)]/35 p-5">
              <h3 className="text-lg font-bold text-[var(--casa-ink)]">{leitbild.aimsTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{leitbild.aimsText}</p>
            </section>
          </article>
        </Container>
      </section>

      {/* Section 5: Tandem Program */}
      <section id="tandem" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white scroll-mt-28">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{tandemGuide.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] md:text-3xl">{tandemGuide.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{tandemGuide.intro}</p>

              {/* Two adjacent buttons with different labels and the identical
                  /contact href. The /about hero already carries "Talk to
                  admissions" -> /contact as its primary, so this block was the
                  second and third route to one page. One text link now. */}
              <div className="mt-5">
                <TextCta href="/contact">{tandemGuide.primaryCta}</TextCta>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl bg-[var(--casa-surface-wash)] p-5">
                <h3 className="text-base font-bold text-[var(--casa-ink)]">{tandemGuide.stepsTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {tandemGuide.steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-[var(--casa-muted)]">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--casa-blue)]/12 text-xs font-bold text-[var(--casa-accent-text)]">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-xl bg-[var(--casa-warm-soft)]/35 p-5">
                <h3 className="text-base font-bold text-[var(--casa-ink)]">{tandemGuide.benefitsTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {tandemGuide.benefits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--casa-muted)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-ink)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </Container>
      </section>

      {/* Section 6: Community Story Block */}
      {communityStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
          <Container>
            <HumanStoryBlock
              eyebrow={locale === 'de' ? 'Erfahrungen bei CASA' : 'Life at CASA'}
              title={
                locale === 'de'
                  ? 'Was CASA für unsere Teilnehmenden bedeutet'
                  : 'What CASA means to our students'
              }
              quote={communityStory.quote}
              person={communityStory.personDisplay}
              context={communityStory.country}
              photo={{
                src: pageConfig.photos.story.src,
                alt: pageConfig.photos.story.alt,
              }}
              supportingText={
                locale === 'de'
                  ? 'Gemeinsam lernen, sich gegenseitig unterstützen und in Bremen Anschluss finden: Das gehört für uns zusammen.'
                  : 'Learning together, supporting one another and finding a sense of belonging are all part of life at CASA.'
              }
              mediaSide="right"
            />
          </Container>
        </section>
      ) : null}

      {/*
        NO TESTIMONIAL GRID HERE.

        Section 6 directly above is already a learner quote, and this was a grid of
        the same seven quotes plus a featured tile — two testimonial treatments
        back to back, the second one restating the first at four times the height.
        The seven quotes were rendering on nine separate surfaces across the site,
        which is how social proof stops reading as proof.

        A mission page earns one voice. It has one.
      */}
    </main>
  );
}
