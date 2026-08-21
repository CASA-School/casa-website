import type { Metadata } from 'next';

import { HeroDGallery } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, ProcessSteps } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Become a Host Family',
  description: 'Open your home to international CASA students and support language learning through daily life in Bremen.',
  path: '/accommodation/become-host',
  keywords: ['Host family Bremen', 'Become host family', 'Student accommodation'],
});

const hostFamilyPhotos = {
  dinner: {
    src: '/media/casa/shared-flat-kitchen-table.jpg',
    alt: {
      en: 'shared kitchen and dining table prepared for student routines',
      de: 'Gemeinsame Küche mit Esstisch für studentische Alltagsroutinen',
    },
    caption: {
      en: 'Daily routines create practical moments for language and trust.',
      de: 'Alltagsroutinen schaffen praktische Momente für Sprache und Vertrauen.',
    },
  },
  arrival: {
    src: '/media/casa/student-room-balcony.jpg',
    alt: {
      en: 'bright student room with bed, desk, and balcony doors',
      de: 'Helles Studierendenzimmer mit Bett, Schreibtisch und Balkontüren',
    },
    caption: {
      en: 'Welcoming students starts with a clear, practical place to arrive.',
      de: 'Gastfreundschaft beginnt mit einem klaren, praktischen Ankommensort.',
    },
  },
  home: {
    src: '/media/casa/student-room-alternative-1.jpg',
    alt: {
      en: 'bright furnished student room prepared for a stable stay in Bremen',
      de: 'Helles möbliertes Studierendenzimmer für einen stabilen Aufenthalt in Bremen',
    },
    caption: {
      en: 'A stable living rhythm supports the learning that happens at CASA.',
      de: 'Ein stabiler Wohnalltag unterstützt das Lernen bei CASA.',
    },
  },
} as const;

export default async function BecomeHostFamilyPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('accommodation-detail');

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Gastfamilie bei CASA',
          title: 'Gastfamilie werden und internationale Lernwege begleiten',
          description:
            'Seit 1983 vermittelt CASA Lernende an Gastgeber in Bremen. Ob Familie, Paar oder Einzelperson: entscheidend sind Offenheit, Zuverlässigkeit und Freude am interkulturellen Austausch.',
          breadcrumbs: [
            { label: 'Start', href: '/' },
            { label: 'Unterkunft', href: '/accommodation' },
            { label: 'Gastfamilie werden' },
          ],
          heroCtas: [
            { label: 'Gastfamilie anfragen', href: '/contact?topic=host-family', kind: 'primary' as const },
            { label: 'Unterkunft ansehen', href: '/accommodation', kind: 'secondary' as const },
          ],
          storyEyebrow: 'Wie Hosting bei CASA funktioniert',
          storyTitle: 'Gastgebersein bedeutet mehr als ein Zimmer anzubieten',
          storyDescription:
            'Wir suchen Haushalte, die Lernenden ein stabiles Umfeld für Sprache, Alltag und Orientierung geben. CASA begleitet Matching, Kommunikation und organisatorische Abstimmung.',
          storyBullets: [
            'Möbliertes Einzelzimmer mit Bett, Schreibtisch und Stauraum',
            'Zugang zu Bad und alltagsnaher Wohnnutzung',
            'Gute ÖPNV-Erreichbarkeit zur CASA Sprachschule',
            'Klare Hausregeln und gegenseitige Erwartungen',
          ],
          /*
            Aus dem CASA Check-in/Check-out-Formular selbst
            (docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md). Genau die Positionen, die
            das Formular bei An- und Abreise bewertet — daran kann ein Haushalt
            vorab selbst prüfen, ob das Zimmer passt.
          */
          roomTitle: 'Was das Zimmer mitbringen sollte',
          roomDescription:
            'Bei An- und Abreise halten Gastgeber und Lernende den Zustand gemeinsam auf einem Formular fest. Bewertet werden genau diese Positionen:',
          roomItems: [
            'Bett und Matratze',
            'Schreibtisch und Stuhl',
            'Kleiderschrank sowie Regal oder Nachttisch',
            'Funktionsfähige Lampe',
            'Bettwäsche (Anzahl wird festgehalten)',
          ],
          agreementTitle: 'Was Sie festlegen — und was schriftlich steht',
          agreementDescription:
            'Hausregeln und Mitbenutzung bestimmen Sie. Beides wird zusammen mit dem Zimmerzustand dokumentiert und von beiden Seiten unterschrieben — bei der Ankunft und bei der Abreise. Das schützt Ihren Haushalt genauso wie die Lernenden.',
          agreementRules: ['Rauchen', 'Besuch', 'Reinigung'],
          agreementShared: ['Küche', 'Bad', 'Waschmaschine', 'WLAN'],
          agreementRulesLabel: 'Hausregeln, die Sie setzen',
          agreementSharedLabel: 'Mitbenutzung, die Sie anbieten',
          contactTitle: 'Ansprechperson für Unterkunft',
          contactBody: 'Fragen zum Gastgebersein beantwortet das Unterkunftsteam direkt.',
          comparisonEyebrow: 'Aufnahmeformate',
          comparisonTitle: 'Einzelkursteilnehmende oder Gruppenaufenthalte',
          comparisonDescription:
            'CASA vermittelt sowohl langfristigere Aufenthalte für Intensivkurse als auch kurze Aufenthalte für Gruppenprogramme.',
          requirementsTitle: 'Was CASA von Gastgeberhaushalten erwartet',
          requirementsItems: [
            'Verlässliche Kommunikation zu Einzug, Regeln und Tagesablauf',
            'Respektvoller, kulturoffener Umgang im gemeinsamen Alltag',
            'Verfügbare Kapazität im vereinbarten Zeitraum',
            'Bereitschaft, Fragen frühzeitig mit CASA zu klären',
          ],
          supportTitle: 'Was CASA organisiert',
          supportItems: [
            'Passendes Matching nach Kursformat und Aufenthaltsdauer',
            'Vorabinformationen zu Profil, Zeitraum und besonderen Hinweisen',
            'Ansprechperson bei Rückfragen während des Aufenthalts',
            'Den Satz für Ihr Format erhalten Sie schriftlich, bevor Sie zusagen',
          ],
          processEyebrow: 'Nächster Schritt',
          processTitle: 'In drei Schritten Gastgeberhaushalt werden',
          processDescription:
            'Der Ablauf ist klar strukturiert, damit Sie schnell entscheiden können, ob Hosting zu Ihrem Haushalt passt.',
          processSteps: [
            { step: '1', title: 'Interesse senden', description: 'Kurze Anfrage mit Haushaltsprofil und Verfügbarkeit.' },
            { step: '2', title: 'Profilabgleich', description: 'CASA stimmt Formate, Dauer und Rahmenbedingungen mit Ihnen ab.' },
            { step: '3', title: 'Placement bestätigen', description: 'Sie erhalten alle Details vor der finalen Zusage.' },
          ],
          processCta: { label: 'Gastfamilie anfragen', href: '/contact?topic=host-family' },
          intensiveTitle: 'Intensivkurs-Lernende',
          groupTitle: 'Gruppenaufenthalte',
        }
      : {
          eyebrow: 'Host with CASA',
          title: 'Become a host family and support international learners',
          description:
            'Since 1983, CASA has matched students with welcoming homes in Bremen. Families, couples, and single-person households can all host when they offer reliability, openness, and interest in intercultural exchange.',
          breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: 'Accommodation', href: '/accommodation' },
            { label: 'Become a host family' },
          ],
          heroCtas: [
            { label: 'Apply as host family', href: '/contact?topic=host-family', kind: 'primary' as const },
            { label: 'View accommodation', href: '/accommodation', kind: 'secondary' as const },
          ],
          storyEyebrow: 'How hosting works at CASA',
          storyTitle: 'Hosting is more than offering a room',
          storyDescription:
            'We look for households that provide a stable environment for language growth, everyday orientation, and respectful exchange. CASA supports matching, communication, and practical coordination.',
          storyBullets: [
            'Furnished single room with bed, desk, and storage',
            'Access to bathroom and shared household facilities',
            'Good public transport connection to CASA',
            'Clear house rules and shared expectations',
          ],
          /*
            Taken from CASA's own check-in/check-out form
            (docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md). These are exactly the
            items the form rates at arrival and departure, so a household can
            check its own room against the list before enquiring.
          */
          roomTitle: 'What the room needs',
          roomDescription:
            'At arrival and again at departure, the host and the student record the condition together on one form. These are the items it rates:',
          roomItems: [
            'A bed and a mattress',
            'A desk and a chair',
            'A wardrobe, plus a shelf or bedside table',
            'A working lamp',
            'Bed linen — the count is recorded',
          ],
          agreementTitle: 'What you set, and what goes in writing',
          agreementDescription:
            'The house rules and the shared facilities are yours to decide. Both are written down alongside the room\u2019s condition and signed by both sides, at arrival and at departure. That protects your household as much as it protects the student.',
          agreementRules: ['Smoking', 'Visitors', 'Cleaning'],
          agreementShared: ['Kitchen', 'Bathroom', 'Washing machine', 'WLAN'],
          agreementRulesLabel: 'House rules you set',
          agreementSharedLabel: 'Facilities you share',
          contactTitle: 'Your accommodation contact',
          contactBody: 'The accommodation team answers questions about hosting directly.',
          comparisonEyebrow: 'Hosting formats',
          comparisonTitle: 'Individual course participants or group stays',
          comparisonDescription:
            'CASA places both longer-stay intensive learners and short-term educational groups with host households.',
          requirementsTitle: 'What CASA expects from host households',
          requirementsItems: [
            'Reliable communication around arrival, rules, and daily rhythm',
            'Respectful and culturally open interaction in shared living',
            'Confirmed availability for the agreed hosting period',
            'Willingness to coordinate early with CASA when needed',
          ],
          supportTitle: 'What CASA handles',
          supportItems: [
            'Matching by course format, duration, and student profile',
            'Clear pre-arrival information and planning details',
            'Dedicated support contact during hosting period',
            'The rate for your format, in writing, before you agree to anything',
          ],
          processEyebrow: 'Next step',
          processTitle: 'Become a host household in three steps',
          processDescription:
            'The process is structured so you can quickly assess fit and confirm hosting with full clarity.',
          processSteps: [
            { step: '1', title: 'Share interest', description: 'Send a short inquiry with household profile and availability.' },
            { step: '2', title: 'Profile alignment', description: 'CASA aligns format, duration, and practical expectations.' },
            { step: '3', title: 'Confirm placement', description: 'You receive full details before final confirmation.' },
          ],
          processCta: { label: 'Apply as host family', href: '/contact?topic=host-family' },
          intensiveTitle: 'Intensive-course students',
          groupTitle: 'Group stays',
        };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroDGallery
        breadcrumbs={copy.breadcrumbs}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        photos={[
          {
            src: hostFamilyPhotos.dinner.src,
            alt: locale === 'de' ? hostFamilyPhotos.dinner.alt.de : hostFamilyPhotos.dinner.alt.en,
            caption: locale === 'de' ? hostFamilyPhotos.dinner.caption.de : hostFamilyPhotos.dinner.caption.en,
          },
          {
            src: hostFamilyPhotos.arrival.src,
            alt: locale === 'de' ? hostFamilyPhotos.arrival.alt.de : hostFamilyPhotos.arrival.alt.en,
            caption: locale === 'de' ? hostFamilyPhotos.arrival.caption.de : hostFamilyPhotos.arrival.caption.en,
          },
          {
            src: hostFamilyPhotos.home.src,
            alt: locale === 'de' ? hostFamilyPhotos.home.alt.de : hostFamilyPhotos.home.alt.en,
            caption: locale === 'de' ? hostFamilyPhotos.home.caption.de : hostFamilyPhotos.home.caption.en,
          },
        ]}
        ctas={copy.heroCtas}
      />

      {/*
        The breadcrumb band that used to sit here is gone — it rendered BELOW the
        hero, so this page put its breadcrumbs in a different place from
        /accommodation/host and /accommodation/flat, which carry them above the
        h1. HeroDGallery now forwards them to HeroSurface like every other hero.
      */}

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={copy.storyEyebrow}
            title={copy.storyTitle}
            description={copy.storyDescription}
            bullets={copy.storyBullets}
            photo={{
              src: hostFamilyPhotos.arrival.src,
              alt: locale === 'de' ? hostFamilyPhotos.arrival.alt.de : hostFamilyPhotos.arrival.alt.en,
              caption: locale === 'de' ? hostFamilyPhotos.arrival.caption.de : hostFamilyPhotos.arrival.caption.en,
            }}
            /*
              No `ctas` here. This passed `heroCtas` verbatim, so the identical
              "Apply as host family" / "View accommodation" pair rendered in the
              hero and again 400px later, with the process section's own CTA
              making three asks on one page. The hero asks; the process section
              closes. Same reasoning as the course detail next-steps block.
            */
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-white border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ComparisonModule
            eyebrow={copy.comparisonEyebrow}
            title={copy.comparisonTitle}
            description={copy.comparisonDescription}
            leftTitle={copy.intensiveTitle}
            rightTitle={copy.groupTitle}
            rows={[
              {
                label: locale === 'de' ? 'Typischer Zeitraum' : 'Typical duration',
                left: locale === 'de' ? 'Meist 1 bis mehrere Monate' : 'Usually 1 to several months',
                right: locale === 'de' ? 'Meist 1 bis 4 Wochen' : 'Usually 1 to 4 weeks',
              },
              {
                label: locale === 'de' ? 'Gruppengröße' : 'Placement size',
                left: locale === 'de' ? 'Einzelplacement' : 'Individual placement',
                right: locale === 'de' ? 'In der Regel 1 bis 6 Lernende' : 'Usually 1 to 6 students',
              },
              {
                label: locale === 'de' ? 'Verpflegung' : 'Meals',
                left: locale === 'de' ? 'Nach vereinbartem Hostingmodell' : 'Based on agreed hosting model',
                /*
                  Was "Often coordinated with half-board" / "Häufig mit
                  Halbpension organisiert". The verified fact is narrower —
                  COURSE_FACTS_SOURCE_OF_TRUTH.md records group host-family
                  stays as "single or double, meals optional". Half-board is
                  breakfast and dinner specifically, which is not what "optional"
                  states, so this now says what is actually published.
                */
                right: locale === 'de' ? 'Verpflegung optional, nach Absprache' : 'Meals optional, agreed per stay',
              },
              {
                label: locale === 'de' ? 'Tagesstruktur' : 'Daily rhythm',
                left: locale === 'de' ? 'Alltagsnahe Sprachpraxis im Haushalt' : 'Everyday language immersion in household life',
                right: locale === 'de' ? 'Klar strukturierter Ablauf mit Programmzeiten' : 'Structured schedule around program timetable',
              },
              {
                label: locale === 'de' ? 'CASA Begleitung' : 'CASA support',
                left: locale === 'de' ? 'Matching, Kommunikation, Supportkontakt' : 'Matching, communication, and support contact',
                right: locale === 'de' ? 'Koordination, Ablaufabstimmung, Supportkontakt' : 'Coordination, scheduling alignment, and support contact',
              },
              {
                /*
                  "Transparent by placement model" said the word transparent and
                  no number, in a row headed Compensation, on the one page whose
                  reader's first question is what they receive — and the sidebar
                  said "transparent compensation model" as well, so the claim
                  appeared three times and the figure zero. CASA's per-format host
                  rate is not published anywhere in this repository and is not
                  invented here. What the page can promise honestly is when the
                  host learns it. Ask CASA for the rates and put them here.
                */
                label: locale === 'de' ? 'Aufwandsentschädigung' : 'Compensation',
                left:
                  locale === 'de'
                    ? 'Satz je Placement, schriftlich vor der Zusage'
                    : 'A per-placement rate, in writing before you agree',
                right:
                  locale === 'de'
                    ? 'Satz je Gruppenaufenthalt, schriftlich vor der Zusage'
                    : 'A per-group rate, in writing before you agree',
              },
            ]}
          />
        </Container>
      </section>

      {/*
        The two sections a prospective host actually needs, and neither existed.

        Everything here comes from CASA's own check-in/check-out form — the room
        items it rates, the three house rules the host sets, the four shared
        facilities it lists — so a household can measure itself against the real
        document before enquiring. See docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md.
        The form is not published; these are the parts that concern the host.
      */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{copy.roomTitle}</h2>
            <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              {copy.roomDescription}
            </p>
            <ul className="mt-6 border-t border-[color:var(--casa-sand)]">
              {copy.roomItems.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-[color:var(--casa-sand)]/60 py-3 text-sm leading-relaxed text-[var(--casa-ink)]"
                >
                  <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
              {copy.agreementTitle}
            </h2>
            <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              {copy.agreementDescription}
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {[
                { label: copy.agreementRulesLabel, items: copy.agreementRules },
                { label: copy.agreementSharedLabel, items: copy.agreementShared },
              ].map((block) => (
                <div key={block.label}>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {block.label}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {block.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-md bg-[var(--casa-warm-soft)]/35 px-3 py-1.5 text-sm text-[var(--casa-ink)]"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-[color:var(--casa-sand)] pt-6">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {copy.contactTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.contactBody}</p>
              <a
                href="mailto:accommodation@casa-bremen.de"
                className="casa-cta-link mt-3 inline-flex text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline"
              >
                accommodation@casa-bremen.de
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{copy.requirementsTitle}</p>
              <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
              <ul className="mt-4 space-y-3">
                {copy.requirementsItems.map((item) => (
                  <li key={item} className="flex gap-3 text-base text-[var(--casa-ink)]">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{copy.supportTitle}</p>
              <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
              <ul className="mt-4 space-y-3">
                {copy.supportItems.map((item) => (
                  <li key={item} className="flex gap-3 text-base text-[var(--casa-ink)]">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-white border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ProcessSteps
            eyebrow={copy.processEyebrow}
            title={copy.processTitle}
            description={copy.processDescription}
            steps={copy.processSteps}
            cta={copy.processCta}
          />
        </Container>
      </section>
    </main>
  );
}
