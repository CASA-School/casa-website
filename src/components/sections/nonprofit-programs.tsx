import { Icon3D } from '@/components/ui/icon-3d';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { nonprofitIcons3d } from '@/config/icons-3d';
import type { ContentLocale } from '@/lib/content/types';
import { say } from '@/lib/cms/copy';

/**
 * What CASA's non-profit work is, concretely (2026-10-29, from the CASA-Förderverein's own
 * description): free course places for people in hardship, a place to meet, advice beyond the
 * lesson, the tandem; what is being planned; and the Förderverein that carries these projects.
 * Google's Ad Grants review asks a site to describe its programmes and what they achieve, not
 * only its legal form (docs/GOOGLE_AD_GRANTS_COMPLIANCE.md). The numbers are the approved
 * aggregates (CLAUDE.md, hard rule 1), not the Förderverein text's „bis zu 80 Nationen".
 */
export function NonprofitPrograms({ locale }: { locale: ContentLocale }) {
  const programs = [
    {
      key: 'free-places',
      icon: nonprofitIcons3d.freePlaces,
      title: say(locale, 'Freie Kursplätze für Menschen in Not', 'Free course places for people in hardship'),
      text: say(
        locale,
        'Menschen in besonders schwierigen Lebenslagen lernen bei uns immer wieder kostenlos Deutsch. So schließen wir eine Lücke und legen die Basis für ihren Weg in die Gesellschaft und in den Beruf.',
        'Time and again, people in particularly difficult circumstances learn German with us free of charge. This closes a gap and lays the foundation for their way into society and work.'
      ),
    },
    {
      key: 'meeting',
      icon: nonprofitIcons3d.meeting,
      title: say(locale, 'Ein Ort der Begegnung', 'A place to meet'),
      text: say(
        locale,
        'Unsere Cafeteria ist den ganzen Tag für alle Teilnehmenden offen: für Hausaufgaben, zum Üben vor Prüfungen oder zum Kennenlernen. Im Sprachcafé und beim CASA-Stammtisch sprichst du einfach Deutsch.',
        'Our cafeteria is open to all learners throughout the day: for homework, for practising before exams or for getting to know each other. At the language café and the CASA Stammtisch you simply speak German.'
      ),
    },
    {
      key: 'advice',
      icon: nonprofitIcons3d.advice,
      title: say(locale, 'Beratung über den Unterricht hinaus', 'Advice beyond the classroom'),
      text: say(
        locale,
        'In Einzelgesprächen finden wir mit dir die passende Lernstrategie. Wir beraten dich auch zu Wohnungssuche, Beruf und Studium, und nach dem Kurs kannst du vor Prüfungen weiter bei uns lernen.',
        'In one-to-one talks we find the right learning strategy with you. We also advise you on finding a flat, on work and on studying, and after your course you can keep learning with us before exams.'
      ),
    },
    {
      key: 'tandem',
      icon: nonprofitIcons3d.tandem,
      title: say(locale, 'Sprachtandem mit Menschen aus Bremen', 'Language tandem with people from Bremen'),
      text: say(
        locale,
        'Als Mitglied von TANDEM International bringen wir Lernende und Menschen aus Bremen kostenlos ins Gespräch. So lernst du selbstständig weiter und lernst die Stadt kennen.',
        'As a member of TANDEM International we bring learners and people from Bremen together, free of charge. You keep learning on your own terms and get to know the city.'
      ),
      href: '/resources/language-tandem',
      cta: say(locale, 'Mehr zum Sprachtandem', 'More about the language tandem'),
    },
  ];

  const plans = [
    say(
      locale,
      'Ein fast kostenfreier Vorbereitungskurs auf die telc-Prüfung Deutsch B1 für Menschen, die keine Förderung mehr bekommen können.',
      'A preparation course for the telc Deutsch B1 exam at almost no cost, for people who can no longer receive any funding.'
    ),
    say(locale, 'Ein Stipendienprogramm für Lernende, das gerade entsteht.', 'A scholarship programme for learners, now being developed.'),
  ];

  return (
    <section id="angebote" className="scroll-mt-28 pb-14 md:pb-20" aria-labelledby="nonprofit-programs-title">
      <Container>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {say(locale, 'Was gemeinnützig konkret heißt', 'What non-profit means in practice')}
          </p>
          <h2 id="nonprofit-programs-title" className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            {say(locale, 'Brücken bauen, seit 1983', 'Building bridges since 1983')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--casa-ink)]">
            {say(
              locale,
              'Bei CASA lernen Menschen aus über 150 Ländern zusammen, mit unterschiedlicher kultureller, religiöser und sozialer Herkunft. Wir fördern Verständigung, Respekt und Toleranz, nach unserem Leitbild „Miteinander reden – aufeinander zugehen".',
              'At CASA, people from more than 150 countries and of different cultural, religious and social backgrounds learn together. We promote understanding, respect and tolerance, following our guiding principle: talk with each other, reach out to each other.'
            )}
          </p>
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {programs.map((program) => (
            <li key={program.key} className="flex">
              <article data-icon-3d-host className="flex w-full flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
                <Icon3D icon={program.icon} size="lg" />
                <h3 className="mt-5 text-xl font-bold leading-snug text-[var(--casa-ink)]">{program.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{program.text}</p>
                {program.href ? (
                  <TextCta href={program.href} className="mt-auto self-start pt-6">
                    {program.cta}
                  </TextCta>
                ) : null}
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--casa-warm-soft)] p-6 ring-1 ring-[color:var(--casa-sand)] md:p-8">
            <h3 className="text-xl font-bold text-[var(--casa-ink)]">{say(locale, 'Was wir als Nächstes planen', 'What we are planning next')}</h3>
            <ul className="mt-4 grid gap-3">
              {plans.map((plan) => (
                <li key={plan} className="border-l-2 border-[var(--casa-blue)]/30 pl-4 text-base leading-relaxed text-[var(--casa-ink)]">
                  {plan}
                </li>
              ))}
            </ul>
          </div>

          <div data-icon-3d-host className="flex flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
            <Icon3D icon={nonprofitIcons3d.foerderverein} size="md" />
            <h3 className="mt-4 text-xl font-bold text-[var(--casa-ink)]">{say(locale, 'Der CASA-Förderverein e.V.', 'The CASA-Förderverein e.V.')}</h3>
            <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">
              {say(
                locale,
                'Der Förderverein unterstützt unsere gemeinnützige Arbeit bei Projekten wie den freien Kursplätzen und den geplanten Programmen. Wenn du ihn unterstützen möchtest, schreib uns.',
                'Our supporters’ association backs our non-profit work in projects such as the free course places and the programmes we are planning. If you would like to support it, get in touch.'
              )}
            </p>
            <TextCta href="/contact" className="mt-5 self-start">
              {say(locale, 'Kontakt aufnehmen', 'Get in touch')}
            </TextCta>
          </div>
        </div>
      </Container>
    </section>
  );
}
