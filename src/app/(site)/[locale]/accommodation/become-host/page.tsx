import type { Metadata } from 'next';

import { HeroCUtilityRail } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, ProcessSteps } from '@/components/sections';
import { CourseFormatRows } from '@/components/sections/course-format-rows';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Gastfamilie werden in Bremen' : 'Become a host family in Bremen',
    description: locale === 'de' ? 'Du hast ein Zimmer frei? Heiße internationale CASA-Teilnehmende in Bremen willkommen und lerne Menschen aus aller Welt kennen.' : 'Have a room to spare? Welcome international CASA learners into your home in Bremen and meet people from around the world.',
    path: '/accommodation/become-host',
    keywords: ['Host family Bremen', 'Become host family', 'Student accommodation'],
  });
}

/*
 * Only a host family's own rooms on this page (2026-10-02): it is read by people
 * offering a room in their home, so a CASA-WG photo would describe the wrong
 * thing (CLAUDE.md hard rule 5). The photographs live in public-page-config
 * under `becomeHost*`; the guest-room row stays an icon panel (slot 81) until a
 * host family's guest room is photographed.
 */

export default async function BecomeHostFamilyPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('accommodation-detail');
  const { photos } = getPublicPageConfig('accommodation-detail', locale);

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Gastfamilie bei CASA',
          /*
            Kurz gehalten: die Überschrift lief bei 1280px auf vier Zeilen
            (320px) und der Hero 351px über den sichtbaren Bereich hinaus. Wer
            hosten darf — Familie, Paar, Einzelperson — steht weiter unten auf
            der Seite, wo der Satz Platz hat.
          */
          title: 'Gastfamilie werden',
          description:
            'Seit 1983 vermitteln wir Lernende an Gastgeber in Bremen. Wenn du offen für andere Kulturen bist und ein möbliertes Zimmer frei hast, bist du bei uns herzlich willkommen.',
          breadcrumbs: [
            { label: 'Start', href: '/' },
            { label: 'Unterkunft', href: '/accommodation' },
            { label: 'Gastfamilie werden' },
          ],
          heroCtas: [
            { label: 'Zimmer anbieten', href: '/contact?topic=host-family', kind: 'primary' as const },
            { label: 'Unterkunft ansehen', href: '/accommodation', kind: 'secondary' as const },
          ],
          storyEyebrow: 'Gastgeben bei CASA',
          storyTitle: 'Was wir uns von Gastgebern wünschen',
          storyDescription:
            'Viele unserer Lernenden wohnen in ihrer ersten Zeit in Bremen bei Gastgebern. Dafür suchen wir offene Haushalte, ob Familie, Paar oder Einzelperson, in denen sie sich willkommen fühlen.',
          storyBullets: [
            'Du hast ein möbliertes Zimmer mit Bett, Schreibtisch und Kleiderschrank frei.',
            'Dein Gast kann ein Bad nutzen und in der Küche Mahlzeiten zubereiten.',
            'Es hilft, wenn unsere Schule von dir aus gut mit Bus und Bahn zu erreichen ist.',
            'Hausregeln und gegenseitige Erwartungen sprecht ihr von Anfang an klar ab.',
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
            'Bei der Ankunft und bei der Abreise hältst du gemeinsam mit deinem Gast auf einem Formular fest, in welchem Zustand das Zimmer ist. Darauf stehen genau diese Dinge.',
          roomItems: [
            'Bett und Matratze',
            'Schreibtisch und Stuhl',
            'Kleiderschrank sowie Regal oder Nachttisch',
            'Funktionsfähige Lampe',
            'Bettwäsche (Anzahl wird festgehalten)',
          ],
          agreementEyebrow: 'Vereinbarungen',
          agreementTitle: 'Hausregeln und Absprachen',
          agreementDescription:
            'Was in deinem Haushalt gilt, bestimmst du. Damit es später keine Missverständnisse gibt, wird alles zusammen mit dem Zustand des Zimmers auf dem Formular festgehalten. Das schützt deinen Haushalt genauso wie deinen Gast.',
          agreementBullets: [
            'Du legst die Hausregeln fest, zum Beispiel zu Rauchen, Besuch und Reinigung.',
            'Du entscheidest, was dein Gast mitbenutzen darf, etwa Küche, Bad, Waschmaschine und WLAN.',
            'Bei der Ankunft und bei der Abreise unterschreibst du das Formular gemeinsam mit deinem Gast.',
            'Bei Fragen erreichst du unser Unterkunftsteam unter accommodation@casa-bremen.de.',
          ],
          comparisonEyebrow: 'Deine Gäste',
          comparisonTitle: 'Einzelne Lernende oder Gruppen',
          comparisonDescription:
            'Wir vermitteln Lernende aus unseren Intensivkursen, die meist einen oder mehrere Monate bleiben. Außerdem kommen das ganze Jahr über Gruppen zu uns, zum Beispiel aus Italien, Mexiko, Dänemark und Japan.',
          partnershipEyebrow: 'Die Zusammenarbeit',
          partnershipTitle: 'Wer was übernimmt',
          partnershipDescription:
            'Du bietest deinem Gast ein Zuhause und einen Einblick in den Alltag in Bremen. Wir kümmern uns um die Vermittlung, bereiten den Aufenthalt mit dir vor und sind für beide Seiten da.',
          partnershipBullets: [
            'Du stellst für die vereinbarte Zeit ein möbliertes Zimmer bereit, und dein Gast kann Küche und Bad mitbenutzen.',
            'Wenn du Gäste aus einer Gruppe aufnimmst, begrüßt du sie bei der Ankunft am Bahnhof oder Flughafen und beziehst sie möglichst in deinen Familienalltag ein.',
            'Wir wählen deine Gäste passend zu Kurs, Aufenthaltsdauer und Profil aus und informieren dich vorab über alles Wichtige.',
            'Während des ganzen Aufenthalts habt ihr beide, du und dein Gast, bei uns eine Ansprechperson.',
            'Wie hoch die Aufwandsentschädigung ist, erfährst du schriftlich, bevor du zusagst.',
          ],
          processEyebrow: 'Nächster Schritt',
          processTitle: 'So wirst du Gastfamilie',
          processDescription:
            'Wir besprechen mit dir, wie ein Aufenthalt aussehen könnte, damit du in Ruhe entscheiden kannst.',
          processSteps: [
            { step: '1', title: 'Deine Nachricht', description: 'Schreib uns kurz, wer bei dir wohnt, welches Zimmer du anbietest und wann und wie lange es frei ist.' },
            { step: '2', title: 'Ein Gespräch', description: 'Wir sprechen mit dir darüber, welche Gäste zu dir passen, wie lange sie bleiben und was dir wichtig ist.' },
            { step: '3', title: 'Deine Zusage', description: 'Du bekommst alle Einzelheiten, bevor du endgültig zusagst.' },
          ],
          processCta: { label: 'Zimmer anbieten', href: '/contact?topic=host-family' },
          intensiveTitle: 'Lernende im Intensivkurs',
          groupTitle: 'Gruppen',
        }
      : {
          eyebrow: 'Host with CASA',
          /*
            "Become a host", not "Become a host family".
            
            Two reasons, and the second is the better one.
            
            MEASURED: at 1280px this column is 615px wide, and "Become a host
            family" needs 631px on one line of 64px type — 16px too wide, so it
            wrapped to two lines and took the hero 66px past a 720px viewport.
            Not a `text-wrap: balance` artifact; genuinely too long. The German
            ("Gastfamilie werden", 578px) fits and is unchanged.
            
            ACCURATE: this page's own description says families, couples and
            single-person households can all host. "Host family" is the term
            CASA uses in the nav and the breadcrumb, but as a headline it
            under-describes who is being invited.
            
            The full sentence about who may host is directly below, where it has
            room. The original headline also carried "and support international
            learners", which ran to four lines (320px) and 351px past the fold.
          */
          title: 'Become a host',
          description:
            'We have been placing learners with hosts in Bremen since 1983. If you are open to other cultures and have a furnished room free, you are very welcome to host with us.',
          breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: 'Accommodation', href: '/accommodation' },
            { label: 'Become a host family' },
          ],
          heroCtas: [
            { label: 'Offer a room', href: '/contact?topic=host-family', kind: 'primary' as const },
            { label: 'View accommodation', href: '/accommodation', kind: 'secondary' as const },
          ],
          storyEyebrow: 'Hosting with CASA',
          storyTitle: 'What we look for in a host',
          storyDescription:
            'Many of our learners live with hosts when they first come to Bremen. That is why we are looking for open-minded households, whether a family, a couple or someone living alone, where they can feel welcome.',
          storyBullets: [
            'You have a furnished room free, with a bed, a desk and a wardrobe.',
            'Your guest can use a bathroom and cook meals in the kitchen.',
            'It helps if our school is easy to reach from your home by bus or tram.',
            'From the start, you agree clearly on the house rules and what you expect of each other.',
          ],
          /*
            Taken from CASA's own check-in/check-out form
            (docs/ACCOMMODATION_CHECK_IN_OUT_FORM.md). These are exactly the
            items the form rates at arrival and departure, so a household can
            check its own room against the list before enquiring.
          */
          roomEyebrow: 'The room',
          roomTitle: 'What the room should have',
          roomDescription:
            'When your guest arrives and again when they leave, the two of you note the condition of the room together on a form. These are the things it lists.',
          roomItems: [
            'A bed and a mattress',
            'A desk and a chair',
            'A wardrobe, plus a shelf or bedside table',
            'A working lamp',
            'Bed linen (the number of pieces is noted)',
          ],
          agreementEyebrow: 'Agreements',
          agreementTitle: 'House rules and arrangements',
          agreementDescription:
            'You decide the rules in your home. To avoid misunderstandings later, everything is written down on the form along with the condition of the room. That protects your household just as much as your guest.',
          agreementBullets: [
            'You set the house rules, for example on smoking, visitors and cleaning.',
            'You decide what your guest may use, such as the kitchen, bathroom, washing machine and Wi-Fi.',
            'You and your guest sign the form when they arrive and again when they leave.',
            'If you have any questions, you can reach our accommodation team at accommodation@casa-bremen.de.',
          ],
          comparisonEyebrow: 'Your guests',
          comparisonTitle: 'Individual learners or groups',
          comparisonDescription:
            'We place learners from our intensive courses, who usually stay for a month or more. Groups also come to us throughout the year, for example from Italy, Mexico, Denmark and Japan.',
          partnershipEyebrow: 'Working together',
          partnershipTitle: 'Who does what',
          partnershipDescription:
            'You offer your guest a home and a glimpse of everyday life in Bremen. We arrange the placement, prepare the stay with you and are there for both of you.',
          partnershipBullets: [
            'You provide a furnished room for the agreed period, and your guest can use the kitchen and bathroom.',
            'If you host guests from a group, you meet them at the station or airport when they arrive and include them in your family life as much as you can.',
            'We choose your guests to suit their course, length of stay and profile, and tell you everything important in advance.',
            'Throughout the stay, you and your guest have a contact person at CASA.',
            'We tell you in writing how much the hosting allowance is before you agree.',
          ],
          processEyebrow: 'Next step',
          processTitle: 'How to become a host family',
          processDescription:
            'We talk you through what a stay could look like, so you can decide in your own time.',
          processSteps: [
            { step: '1', title: 'Your message', description: 'Send us a few lines about who lives in your home, which room you are offering, and when it is free and for how long.' },
            { step: '2', title: 'A conversation', description: 'We talk with you about which guests would suit you, how long they would stay and what matters to you.' },
            { step: '3', title: 'Your go-ahead', description: 'You get all the details before you give your final go-ahead.' },
          ],
          processCta: { label: 'Offer a room', href: '/contact?topic=host-family' },
          intensiveTitle: 'Intensive-course learners',
          groupTitle: 'Groups',
        };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE COURSE-FORMAT HERO, so the four accommodation pages agree.

        /accommodation/flat, /accommodation/host, /exams/b2 and /exams/c1 all
        render HeroCUtilityRail — copy and photograph left, a facts card right.
        This page was the only detail page in either section still on
        HeroAPhotoLed, which put its columns the other way round (615/721 at
        1440 against the shared 700/620) and gave it no facts card at all, so a
        household arriving from /accommodation met a different layout.

        THE CARD'S THREE ROWS are the questions a household actually arrives
        with, and each is a fact already established further down this page: the
        room requirements from CASA's own check-in/check-out form, the stay
        length from the hosting-format comparison, and the rate — which CASA
        does not publish, so the row says so rather than inventing a figure.

        Both CTAs, not one. Archetype A's rule is a single button because they
        sit in the lede; in this hero they are stacked full-width inside the
        card, which is where the course formats have carried two all along.
      */}
      <HeroCUtilityRail
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        breadcrumbs={copy.breadcrumbs}
        infoTitle={locale === 'de' ? 'Gastgeben im Überblick' : 'Hosting at a glance'}
        infoItems={[
          {
            label: locale === 'de' ? 'Du stellst' : 'You provide',
            value: locale === 'de' ? 'Ein möbliertes Zimmer' : 'A furnished room',
          },
          {
            label: locale === 'de' ? 'Typischer Zeitraum' : 'Typical stay',
            value: locale === 'de' ? '1 bis 4 Wochen oder länger' : '1 to 4 weeks, or longer',
          },
          {
            label: locale === 'de' ? 'Vergütung' : 'Allowance',
            value: locale === 'de' ? 'Schriftlich, bevor du zusagst' : 'In writing, before you agree',
          },
        ]}
        notes={
          locale === 'de'
            ? 'Wir vermitteln passende Gäste, informieren dich vorab und bleiben für beide Seiten erreichbar.'
            : 'We find guests who suit you, tell you about them in advance and are there for both of you.'
        }
        ctas={copy.heroCtas}
        photo={photos.becomeHost}
        photoWide={photos.becomeHostHero}
        themeClassName="hero-theme-accommodation"
      />

      {/*
        The breadcrumb band that used to sit here is gone — it rendered BELOW the
        hero, so this page put its breadcrumbs in a different place from
        /accommodation/host and /accommodation/flat. Every hero forwards them to
        HeroSurface, above the h1.
      */}

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={copy.storyEyebrow}
            title={copy.storyTitle}
            description={copy.storyDescription}
            bullets={copy.storyBullets}
            photo={photos.becomeHostStory}
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
            rowHeading={locale === 'de' ? 'Auf einen Blick' : 'At a glance'}
            leftTitle={copy.intensiveTitle}
            rightTitle={copy.groupTitle}
            rows={[
              {
                label: locale === 'de' ? 'Typischer Zeitraum' : 'Typical stay',
                left: locale === 'de' ? 'Meist ein oder mehrere Monate' : 'Usually a month or more',
                right: locale === 'de' ? 'Meist eine bis vier Wochen' : 'Usually one to four weeks',
              },
              {
                label: locale === 'de' ? 'Anzahl der Gäste' : 'Number of guests',
                left: locale === 'de' ? 'Ein Gast' : 'One guest',
                right: locale === 'de' ? 'In der Regel 1 bis 6 Lernende, in Einzel- oder Doppelzimmern' : 'Usually 1 to 6 learners, in single or double rooms',
              },
              {
                label: locale === 'de' ? 'Verpflegung' : 'Meals',
                left: locale === 'de' ? 'Dein Gast kocht selbst in deiner Küche' : 'Your guest cooks for themselves in your kitchen',
                /*
                  Was "Often coordinated with half-board" / "Häufig mit
                  Halbpension organisiert". The verified fact is narrower —
                  COURSE_FACTS_SOURCE_OF_TRUTH.md records group host-family
                  stays as "single or double, meals optional". Half-board is
                  breakfast and dinner specifically, which is not what "optional"
                  states, so this now says what is actually published.
                */
                right: locale === 'de' ? 'Mit oder ohne Verpflegung, je nach Absprache' : 'With or without meals, as agreed',
              },
              {
                label: locale === 'de' ? 'Tagesablauf' : 'Daily routine',
                left: locale === 'de' ? 'Der Intensivkurs findet bei CASA statt' : 'The intensive course takes place at CASA',
                right: locale === 'de' ? 'Fester Ablauf mit Unterricht und Programm' : 'A fixed timetable of lessons and activities',
              },
              {
                label: locale === 'de' ? 'Begleitung durch CASA' : 'Support from CASA',
                left: locale === 'de' ? 'Wir wählen passende Gäste aus und bleiben deine Ansprechpartner' : 'We choose suitable guests and remain your point of contact',
                right: locale === 'de' ? 'Wir stimmen den Ablauf mit dir ab und bleiben deine Ansprechpartner' : 'We agree the schedule with you and remain your point of contact',
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
                label: locale === 'de' ? 'Aufwandsentschädigung' : 'Hosting allowance',
                left:
                  locale === 'de'
                    ? 'Pro Aufenthalt, schriftlich vereinbart, bevor du zusagst'
                    : 'Per stay, confirmed in writing before you agree',
                right:
                  locale === 'de'
                    ? 'Pro Gruppenaufenthalt, schriftlich vereinbart, bevor du zusagst'
                    : 'Per group stay, confirmed in writing before you agree',
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
      <section className="border-t border-[color:var(--casa-sand)]/40 py-16 md:py-24">
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
                media: { src: photos.becomeHostRoom.src, alt: photos.becomeHostRoom.alt },
              },
              {
                id: 'host-agreement',
                title: copy.agreementTitle,
                description: copy.agreementDescription,
                outcomes: copy.agreementBullets,
                meta: copy.agreementEyebrow,
                media: { src: photos.becomeHostAgreement.src, alt: photos.becomeHostAgreement.alt },
              },
              {
                id: 'host-partnership',
                title: copy.partnershipTitle,
                description: copy.partnershipDescription,
                outcomes: copy.partnershipBullets,
                meta: copy.partnershipEyebrow,
                media: { src: photos.becomeHostPartnership.src, alt: photos.becomeHostPartnership.alt },
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
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
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
