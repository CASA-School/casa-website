import Image from 'next/image';
import { NonprofitProjectTabs } from './nonprofit-project-tabs';
import { Container } from '@/components/ui/container';
import type { ContentLocale } from '@/lib/content/types';

const schools = [
  { name: 'TANDEM Hamburg', city: 'Hamburg', logo: 'hamburg.png', href: 'https://tandem-hamburg.de/' },
  { name: 'TANDEM München', city: 'München', logo: 'munich.png', href: 'https://www.tandem-muenchen.de/' },
  { name: 'TANDEM Madrid', city: 'Madrid', logo: 'madrid.png', href: 'https://www.tandemmadrid.com/' },
  { name: 'Escuela Montalbán', city: 'Granada', logo: 'granada.png', href: 'https://www.escuela-montalban.com/' },
];
const gfhUrl = 'https://www.bildungsberatung-gfh.de/wde/beratung-und-foerderung/foerderung-nach-gfh.php';
const linkClass = 'rounded-sm text-[var(--casa-accent-text)] underline decoration-[var(--casa-blue)]/30 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]';

export function NonprofitPartnerships({ locale }: { locale: ContentLocale }) {
  const de = locale === 'de';
  const projects = [
    {
      name: 'HERE AHEAD', logo: 'here-ahead.svg', href: 'https://www.aheadbremen.de/',
      label: de ? 'Gemeinsam Richtung Studium' : 'A shared path to university',
      text: de
        ? 'HERE AHEAD bereitet internationale Studieninteressierte auf ein Studium in Bremen und Bremerhaven vor. CASA plant und unterrichtet die Sprachkurse der Academy.'
        : 'HERE AHEAD prepares international applicants for university in Bremen and Bremerhaven. CASA plans and teaches the Academy’s language courses.',
    },
    {
      name: ':prime Bremen', logo: 'prime.svg', href: 'https://www.primebremen.de/',
      label: de ? 'Vorbereitung auf den Hochschulzugang' : 'Preparing for university entry',
      text: de
        ? ':prime ist ein Vorbereitungsprogramm von HERE AHEAD. Es verbindet sprachliche und fachliche Vorbereitung für Studieninteressierte, deren Schulabschluss zum Besuch eines Studienkollegs berechtigt.'
        : ':prime is a HERE AHEAD programme combining language and subject preparation for applicants whose school qualifications allow them to attend a Studienkolleg.',
    },
    {
      name: 'Garantiefonds Hochschule', logo: 'gfh.svg', href: gfhUrl,
      label: de ? 'Beratung und Förderung' : 'Advice and funding',
      text: de
        ? 'CASA kooperiert mit der Bildungsberatung Garantiefonds Hochschule. Die Beratungsstellen prüfen die Fördervoraussetzungen und leiten Anträge zur Bearbeitung an die Otto Benecke Stiftung e.V. weiter.'
        : 'CASA works with the Garantiefonds Hochschule educational advice service. Its advisers check eligibility and forward funding applications to the Otto Benecke Stiftung e.V. for processing.',
    },
  ];

  return (
    <>
      <section id="integrationsprojekte" className="scroll-mt-28 bg-white py-16 md:py-24">
        <Container className="grid gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{de ? 'Unser gesellschaftlicher Auftrag' : 'Our public-benefit mission'}</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">{de ? 'Gemeinnützig. Für Bildung und Teilhabe.' : 'A non-profit school. A shared purpose.'}</h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--casa-ink)]">{de ? 'Als gemeinnützige Sprachschule verbinden wir Deutschunterricht mit Beratung und Begegnung. Sprachkenntnisse eröffnen Wege in den Alltag, in Ausbildung, Studium und Beruf.' : 'As a non-profit language school, we bring teaching, personal advice and opportunities to meet others together. German opens doors in everyday life, education and work.'}</p>
            <p className="mt-4 leading-relaxed text-[var(--casa-muted)]">{de ? 'Wir begleiten internationale Lernende und Menschen, die in Bremen neu anfangen. Unsere Bildungskooperationen unterstützen den Weg ins Studium; kostenfreie Sprachtandems, Ausflüge und Begegnungen schaffen Verbindungen im Alltag.' : 'We support international learners and people making a new start in Bremen. Our education partnerships help them prepare for university; free language exchanges, outings and meetups build connections beyond the classroom.'}</p>
            <div className="mt-7 flex items-center gap-4 border-t border-[color:var(--casa-sand)] pt-5">
              <span className="h-8 w-1 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
              <p className="text-sm font-semibold text-[var(--casa-ink)]">{de ? 'Gemeinsam mit HERE AHEAD, :prime und GF-H.' : 'Working with HERE AHEAD, :prime and GF-H.'}</p>
            </div>
          </div>
          <NonprofitProjectTabs projects={projects} locale={locale} />
        </Container>
      </section>
      <section className="bg-[var(--casa-bg)] py-14 md:py-20">
        <Container>
          <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
            <div className="max-w-3xl md:col-start-2 md:row-start-1">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">TANDEM International</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{de ? 'Verbunden über Bremen hinaus' : 'Connections beyond Bremen'}</h2>
              <p className="mt-3 leading-relaxed text-[var(--casa-muted)]">{de ? 'CASA ist Teil des TANDEM-Netzwerks. Mit Sprachschulen in Deutschland und Spanien teilen wir die Freude an Sprachen und interkultureller Begegnung. Lernen Sie eine Auswahl der Schulen aus unserem Netzwerk kennen.' : 'CASA is part of the TANDEM network. We share a love of languages and intercultural exchange with schools in Germany and Spain. Meet a selection of schools from our network.'}</p>
            </div>
            <a href="https://tandem-schools.com/en/" target="_blank" rel="noopener noreferrer" aria-label="TANDEM International" className="md:col-start-1 md:row-start-1 md:mr-8 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]"><Image src="/accreditations/tandem-international-bremen.png" alt="TANDEM Language Schools" width={280} height={141} className="h-auto w-52" /></a>
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-[color:var(--casa-sand)] py-6 lg:grid-cols-4" aria-label={de ? 'Schulen im TANDEM-Netzwerk' : 'Schools in the TANDEM network'}>
            {schools.map(school => <li key={school.name}><a href={school.href} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col rounded-lg px-2 transition-colors hover:bg-[var(--casa-bg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)] md:px-4">
              <Image src={`/partners/${school.logo}`} alt={school.name} width={240} height={100} className="h-16 w-full object-contain" sizes="(min-width: 1024px) 240px, 40vw" />
              <p className="mt-4 text-sm font-semibold text-[var(--casa-ink)]">{school.name} ↗</p><p className="mt-1 text-xs text-[var(--casa-muted)]">{!de && school.city === 'München' ? 'Munich' : school.city} · {['Madrid', 'Granada'].includes(school.city) ? (de ? 'Spanien' : 'Spain') : (de ? 'Deutschland' : 'Germany')}</p>
            </a></li>)}
          </ul>
          <p className="mt-6 text-sm font-semibold"><a href="https://tandem-schools.com/en/" target="_blank" rel="noopener noreferrer" className={linkClass}>{de ? 'Das gesamte TANDEM-Netzwerk entdecken' : 'Explore the full TANDEM network'} ↗</a></p>
        </Container>
      </section>
    </>
  );
}
