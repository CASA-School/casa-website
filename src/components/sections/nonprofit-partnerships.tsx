import Image from 'next/image';
import { Container } from '@/components/ui/container';
import type { ContentLocale } from '@/lib/content/types';

const schools = [
  { name: 'TANDEM Hamburg', city: 'Hamburg', logo: 'hamburg.png', href: 'https://tandem-hamburg.de/' },
  { name: 'TANDEM München', city: 'München', logo: 'munich.png', href: 'https://www.tandem-muenchen.de/' },
  { name: 'TANDEM Madrid', city: 'Madrid', logo: 'madrid.png', href: 'https://www.tandemmadrid.com/' },
  { name: 'Escuela Montalbán', city: 'Granada', logo: 'granada.png', href: 'https://www.escuela-montalban.com/' },
];
const gfhUrl = 'https://www.bildungsberatung-gfh.de/wde/beratung-und-foerderung/foerderung-nach-gfh.php';
const obsUrl = 'https://www.obs-ev.de/akademische-qualifizierung/garantiefonds-hochschule-2022/wie-kann-ich-mich-anmelden';
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
      <section id="integrationsprojekte" className="scroll-mt-28 border-b border-[color:var(--casa-sand)]/50 py-14 md:py-20">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{de ? 'Bildung verbindet' : 'Education brings us together'}</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">{de ? 'Gemeinsam Perspektiven eröffnen' : 'Opening doors together'}</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{de ? 'Mit unseren Kooperationspartnern begleiten wir Menschen auf ihrem Weg ins Studium. Sprachunterricht, Vorbereitung und Beratung greifen dabei ineinander.' : 'Together with our partners, we help people take their next step towards university, bringing language learning, preparation and advice together.'}</p>
          </div>
          <div className="mt-9 divide-y divide-[color:var(--casa-sand)] border-y border-[color:var(--casa-sand)]">
            {projects.map(project => (
              <article key={project.name} className="grid items-center gap-5 py-7 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-x-9 md:py-9 xl:grid-cols-[13rem_minmax(0,1fr)_11rem] xl:gap-x-12">
                <a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name} className={`flex h-28 w-full max-w-52 items-center justify-center rounded-lg px-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)] ${project.logo === 'gfh.svg' ? 'bg-[var(--casa-ink-deep)]' : 'bg-white'}`}>
                  <Image src={`/partners/${project.logo}`} alt={project.name} width={280} height={100} className="h-16 w-full object-contain" />
                </a>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{project.label}</p>
                  <h3 className="mt-2 text-2xl font-bold">{project.name}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)]">{project.text}</p>
                </div>
                <div className="space-y-3 text-sm md:col-start-2 xl:col-start-auto">
                  <p className="font-semibold"><a href={project.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{de ? 'Mehr erfahren' : 'Find out more'}<span className="sr-only">: {project.name}</span> ↗</a></p>
                  {project.logo === 'gfh.svg' && <p><a href={obsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>Otto Benecke Stiftung e.V. ↗</a></p>}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-9 grid gap-7 md:grid-cols-2 md:gap-12">
            <div><h3 className="text-xl font-bold">{de ? 'Tandem & Begegnung' : 'Language exchange & connection'}</h3><p className="mt-2 leading-relaxed text-[var(--casa-muted)]">{de ? 'Kostenfreie Sprachpraxis und kultureller Austausch bringen Deutschlernende und Menschen aus Bremen zusammen.' : 'Free language practice and cultural exchange bring German learners and people from Bremen together.'}</p></div>
            <div><h3 className="text-xl font-bold">{de ? 'In Bremen ankommen' : 'Finding your feet in Bremen'}</h3><p className="mt-2 leading-relaxed text-[var(--casa-muted)]">{de ? 'Ausflüge, Begegnungen und Orientierung im Alltag helfen, neue Freundschaften zu schließen und sich zu Hause zu fühlen.' : 'Outings, meetups and practical guidance help students make friends and feel at home.'}</p></div>
          </div>
        </Container>
      </section>
      <section className="bg-white py-14 md:py-20">
        <Container>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">TANDEM International</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">{de ? 'Verbunden über Bremen hinaus' : 'Connections beyond Bremen'}</h2>
              <p className="mt-4 leading-relaxed text-[var(--casa-muted)] md:text-lg">{de ? 'CASA ist Teil des TANDEM-Netzwerks. Mit Sprachschulen in Deutschland und Spanien teilen wir die Freude an Sprachen und interkultureller Begegnung. Lernen Sie eine Auswahl der Schulen aus unserem Netzwerk kennen.' : 'CASA is part of the TANDEM network. We share a love of languages and intercultural exchange with schools in Germany and Spain. Meet a selection of schools from our network.'}</p>
            </div>
            <a href="https://tandem-schools.com/en/" target="_blank" rel="noopener noreferrer" aria-label="TANDEM International" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]"><Image src="/accreditations/tandem-international-bremen.png" alt="TANDEM Language Schools" width={280} height={141} className="h-auto w-52" /></a>
          </div>
          <ul className="mt-9 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label={de ? 'Schulen im TANDEM-Netzwerk' : 'Schools in the TANDEM network'}>
            {schools.map(school => <li key={school.name}><a href={school.href} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col rounded-xl bg-[var(--casa-bg)] p-4 transition-colors hover:bg-[var(--casa-blue)]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)] md:p-6">
              <Image src={`/partners/${school.logo}`} alt={school.name} width={240} height={100} className="h-24 w-full rounded-lg bg-white p-3 object-contain" sizes="(min-width: 1024px) 240px, 40vw" />
              <p className="mt-5 min-h-10 text-sm font-semibold text-[var(--casa-ink)]">{school.name} ↗</p><p className="mt-1 text-xs text-[var(--casa-muted)]">{!de && school.city === 'München' ? 'Munich' : school.city} · {['Madrid', 'Granada'].includes(school.city) ? (de ? 'Spanien' : 'Spain') : (de ? 'Deutschland' : 'Germany')}</p>
            </a></li>)}
          </ul>
          <p className="mt-6 text-sm font-semibold"><a href="https://tandem-schools.com/en/" target="_blank" rel="noopener noreferrer" className={linkClass}>{de ? 'Das gesamte TANDEM-Netzwerk entdecken' : 'Explore the full TANDEM network'} ↗</a></p>
        </Container>
      </section>
    </>
  );
}
