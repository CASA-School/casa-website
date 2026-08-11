import type { Metadata } from 'next';

import { HeroDGallery } from '@/components/heroes';
import { ComparisonModule, EditorialSplit, ProcessSteps } from '@/components/sections';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
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
            'Transparente Aufwandsentschädigung je nach Format',
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
            'Transparent compensation model by hosting format',
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

      <section className="py-6 md:py-8 bg-white">
        <Container>
          <Breadcrumbs items={copy.breadcrumbs} />
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-slate-50/30 border-t border-[color:var(--casa-sand)]/40">
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
            ctas={copy.heroCtas}
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
                right: locale === 'de' ? 'Häufig mit Halbpension organisiert' : 'Often coordinated with half-board',
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
                label: locale === 'de' ? 'Aufwandsentschädigung' : 'Compensation',
                left: locale === 'de' ? 'Transparent je Placementmodell' : 'Transparent by placement model',
                right: locale === 'de' ? 'Transparent je Gruppensetting' : 'Transparent by group arrangement',
              },
            ]}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 bg-slate-50/30 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{copy.requirementsTitle}</p>
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

            <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{copy.supportTitle}</p>
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
