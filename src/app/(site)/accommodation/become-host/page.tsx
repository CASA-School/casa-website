import type { Metadata } from 'next';

import { HeroDGallery } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, ProcessSteps } from '@/components/sections';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
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
  partnership: {
    src: '/media/casa/host-family-room.jpg',
    alt: {
      en: 'host family room prepared for an arriving student',
      de: 'Gastfamilienzimmer, vorbereitet für eine ankommende Lernende',
    },
    caption: {
      en: 'CASA stays the contact for both sides for the whole stay.',
      de: 'CASA bleibt für beide Seiten während des gesamten Aufenthalts Ansprechpartner.',
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
          roomEyebrow: 'Das Zimmer',
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
          agreementEyebrow: 'Vereinbarungen',
          agreementTitle: 'Was Sie festlegen — und was schriftlich steht',
          agreementDescription:
            'Hausregeln und Mitbenutzung bestimmen Sie. Beides wird zusammen mit dem Zimmerzustand dokumentiert und von beiden Seiten unterschrieben — bei der Ankunft und bei der Abreise. Das schützt Ihren Haushalt genauso wie die Lernenden.',
          agreementBullets: [
            'Hausregeln, die Sie setzen: Rauchen, Besuch, Reinigung',
            'Mitbenutzung, die Sie anbieten: Küche, Bad, Waschmaschine, WLAN',
            'Alles wird bei Ankunft und Abreise von beiden Seiten unterschrieben',
            'Fragen beantwortet das Unterkunftsteam: accommodation@casa-bremen.de',
          ],
          comparisonEyebrow: 'Aufnahmeformate',
          comparisonTitle: 'Einzelkursteilnehmende oder Gruppenaufenthalte',
          comparisonDescription:
            'CASA vermittelt sowohl langfristigere Aufenthalte für Intensivkurse als auch kurze Aufenthalte für Gruppenprogramme.',
          partnershipEyebrow: 'Die Zusammenarbeit',
          partnershipTitle: 'Wer was übernimmt',
          partnershipDescription:
            'Gastgeben ist eine Aufteilung, keine Übergabe. Sie bringen das Zuhause und den Alltag; CASA bringt das Matching, die Vorbereitung und eine Ansprechperson, die während des ganzen Aufenthalts erreichbar bleibt.',
          partnershipBullets: [
            'Sie sagen zu: ein verlässlicher Alltag, offener Umgang und der vereinbarte Zeitraum',
            'CASA wählt aus: passend nach Kursformat, Aufenthaltsdauer und Profil',
            'CASA informiert vorab: Profil, Zeitraum und besondere Hinweise, bevor jemand ankommt',
            'CASA bleibt erreichbar: eine Ansprechperson für beide Seiten, nicht nur am Anfang',
            'Schriftlich vor der Zusage: der Satz für Ihr Format',
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
          roomEyebrow: 'The room',
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
          agreementEyebrow: 'The agreement',
          agreementTitle: 'What you set, and what goes in writing',
          agreementDescription:
            'The house rules and the shared facilities are yours to decide. Both are written down alongside the room\u2019s condition and signed by both sides, at arrival and at departure. That protects your household as much as it protects the student.',
          agreementBullets: [
            'House rules you set: smoking, visitors, cleaning',
            'Facilities you share: kitchen, bathroom, washing machine, WLAN',
            'All of it signed by both sides, at arrival and at departure',
            'Questions go to the accommodation team: accommodation@casa-bremen.de',
          ],
          comparisonEyebrow: 'Hosting formats',
          comparisonTitle: 'Individual course participants or group stays',
          comparisonDescription:
            'CASA places both longer-stay intensive learners and short-term educational groups with host households.',
          partnershipEyebrow: 'The partnership',
          partnershipTitle: 'Who carries what',
          partnershipDescription:
            'Hosting is a division of work, not a handover. You bring the home and the daily rhythm; CASA brings the matching, the preparation, and a contact who stays reachable for the whole stay.',
          partnershipBullets: [
            'You commit to: a dependable daily rhythm, an open household, and the dates you agreed',
            'CASA chooses the match: by course format, length of stay, and student profile',
            'CASA briefs you first: the profile, the dates, and anything particular, before anyone arrives',
            'CASA stays reachable: one contact for both sides, not only at the start',
            'In writing before you agree: the rate for your format',
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

      {/*
        THE PAGE'S ONE INVERTED FIELD.

        Measured before this, become-host ran wash / warm / white / warm / open /
        warm — three warm panels and not a single dark band, while the homepage
        takes its rhythm from four ink-deep fields punctuating the light ones. A
        page of light and warm only reads as one long tunnel however good each
        section is. The comparison is the moment a prospective host decides which
        format suits them, so it is the section that earns the weight.
      */}
      <section className="bg-[var(--casa-ink-deep)] py-16 md:py-24">
        <Container>
          <ComparisonModule
            tone="dark"
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
        THE COURSE-FORMAT ROWS COMPOSITION, on white.

        These two were EditorialSplit panels running the full container. They are
        not the single "Why CASA" panel that component is for — they are a PAIR of
        alternating copy-and-photograph rows, which is exactly what the course
        formats are on the homepage and on /courses. So they use that component:
        the same 85rem measure, the same md:grid-cols-2 with the photograph
        flipping side on every other row, the same 12/20 vertical rhythm.

        `tone="light"` on a white band rather than the ink-deep field the homepage
        uses, because this page already spends its one inverted band on the
        comparison above. `maxOutcomes={5}` because a room has five items to list
        and the course default of three exists to keep six formats comparable, not
        to cap content.
      */}
      <section className="border-t border-[color:var(--casa-sand)]/40 bg-white py-16 md:py-24">
        {/*
          `px-6 md:px-9` so these rows share the panels' content column. Without
          it the row headings sat at x=40 while every panel heading on the page
          sat at x=76, and a 36px step in the text edge is exactly what makes a
          page look like its sections are different widths.
        */}
        <Container>
          {/* Inside the gutter, not replacing it: Container's padding-inline comes
              from CSS, so px-9 on it would override the 40px gutter rather than
              add to it. */}
          <div className="px-6 md:px-9">
          <CourseFormatRows
            tone="light"
            maxOutcomes={5}
            rows={[
              {
                id: 'host-room',
                title: copy.roomTitle,
                description: copy.roomDescription,
                outcomes: copy.roomItems,
                meta: copy.roomEyebrow,
                media: {
                  src: hostFamilyPhotos.arrival.src,
                  alt: locale === 'de' ? hostFamilyPhotos.arrival.alt.de : hostFamilyPhotos.arrival.alt.en,
                },
              },
              {
                id: 'host-agreement',
                title: copy.agreementTitle,
                description: copy.agreementDescription,
                outcomes: copy.agreementBullets,
                meta: copy.agreementEyebrow,
                media: {
                  src: hostFamilyPhotos.home.src,
                  alt: locale === 'de' ? hostFamilyPhotos.home.alt.de : hostFamilyPhotos.home.alt.en,
                },
              },
              {
                id: 'host-partnership',
                title: copy.partnershipTitle,
                description: copy.partnershipDescription,
                outcomes: copy.partnershipBullets,
                meta: copy.partnershipEyebrow,
                media: {
                  src: hostFamilyPhotos.partnership.src,
                  alt:
                    locale === 'de'
                      ? hostFamilyPhotos.partnership.alt.de
                      : hostFamilyPhotos.partnership.alt.en,
                },
              },
            ]}
          />
          </div>
        </Container>
      </section>

      {/*
        The "what CASA expects" / "what CASA handles" pair used to be a separate
        two-column block here. It is now the THIRD row of the section above —
        "Who carries what" — because that is what those two lists were: one
        division of labour, split across two headings that made the reader do the
        joining. Merged, reworded so each line names who does the thing, and it
        gains the composition and the photograph the other two rows have.

        It also removes the last section on this page whose text sat at a
        different left edge from the panels around it.
      */}
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
