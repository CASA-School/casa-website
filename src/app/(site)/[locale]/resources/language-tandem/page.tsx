import type { Metadata } from 'next';

import { CheckCircle2 } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { TandemDialog } from '@/components/resources/tandem-dialog';
import { ProcessSteps } from '@/components/sections';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Icon3D } from '@/components/ui/icon-3d';
import { TextCta } from '@/components/ui/text-cta';
import { TANDEM_ANCHOR } from '@/config/content/tandem';
import { tandemIcons3d } from '@/config/icons-3d';
import { Link } from '@/i18n/navigation';
import { pickTree, say } from '@/lib/cms/copy';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

const PATH = '/resources/language-tandem';
const FORM = `${PATH}#${TANDEM_ANCHOR}` as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: say(locale, 'Sprachtandem in Bremen', 'Language tandem in Bremen'),
    description: say(
      locale,
      'Sprachtandem in Bremen: CASA bringt Deutschlernende und Menschen aus Bremen zusammen. Sag uns, welche Sprachen du sprichst, und wir finden dein Tandem.',
      'Language tandem in Bremen: CASA brings learners of German together with people from Bremen. Tell us your languages and we will find your tandem partner.'
    ),
    path: PATH,
    keywords: ['Sprachtandem Bremen', 'Tandempartner Bremen', 'Language tandem Bremen'],
  });
}

/*
 * THE LANGUAGE TANDEM (Rahman, 2026-10-29: „it connects people from Bremen with our students"). Its
 * own page under Ratgeber, as casa-bremen.de had one with a form; it was a section of the Leitbild
 * until then. The two sides of a tandem first, the four steps in the guidance panel, what it gives
 * you, and the form as a popup that every „Tandem anfragen" on the site opens.
 */
export default async function LanguageTandemPage() {
  const locale = await getContentLocale();

  const t = pickTree(locale, {
    de: {
      eyebrow: 'Sprachtandem',
      title: 'Zwei Sprachen, ein gemeinsames Gespräch',
      intro:
        'Im Sprachtandem lernen zwei Menschen voneinander: Lernende von CASA und Menschen aus Bremen, die Deutsch sprechen. Du übst eine Sprache im echten Gespräch und gibst deine eigene weiter.',
      cta: 'Tandem anfragen',
      meta: ['Für CASA-Lernende', 'Für Menschen aus Bremen'],
      sidesTitle: 'Zwei Seiten, ein Tandem',
      learnerTitle: 'Du lernst Deutsch bei CASA',
      learnerText:
        'Übe dein Deutsch im Gespräch mit jemandem aus Bremen und lerne die Stadt von einer neuen Seite kennen. Dafür hilfst du deinem Gegenüber beim Lernen deiner Sprache.',
      bremenTitle: 'Du sprichst Deutsch und lebst in Bremen',
      bremenText:
        'Wir suchen auch deutschsprachige Tandempartnerinnen und -partner. Übe eine andere Sprache und lerne Menschen aus vielen Ländern kennen, die bei CASA Deutsch lernen.',
      stepsEyebrow: 'Ablauf',
      stepsTitle: 'So funktioniert es',
      stepsText: 'Vom Formular bis zum ersten Treffen begleiten wir dich.',
      steps: [
        { title: 'Formular ausfüllen', description: 'Schreib uns, welche Sprache du sprichst und welche du lernen oder verbessern möchtest.' },
        { title: 'Wir suchen für dich', description: 'Wir suchen eine passende Tandempartnerin oder einen passenden Tandempartner für dich.' },
        { title: 'Erstes Treffen bei CASA', description: 'Sobald wir jemanden gefunden haben, melden wir uns bei dir und verabreden gemeinsam mit euch ein erstes Treffen bei uns in der Schule.' },
        { title: 'Weiter im Tandem', description: 'Wenn ihr euch weiter treffen möchtet, tauscht ihr eure Kontaktdaten aus. Gern könnt ihr euch auch weiterhin bei uns treffen.' },
      ],
      benefitsTitle: 'Was dir ein Tandem bringt',
      benefits: [
        'Du frischst deine Sprachkenntnisse auf und verbesserst sie.',
        'Du sprichst mehr und wirst im Alltag sicherer.',
        'Du lernst neue Menschen und ihre Kultur kennen.',
        'Was du im Unterricht lernst, wendest du im echten Gespräch an.',
      ],
      closingTitle: 'Bereit für dein Tandem?',
      closingText: 'Sag uns, welche Sprachen du sprichst und welche du üben möchtest. Den Rest übernehmen wir.',
    },
    en: {
      eyebrow: 'Language tandem',
      title: 'Two languages, one conversation',
      intro:
        'In a language tandem, two people learn from each other: CASA learners and people in Bremen who speak German. You practise a language in real conversation and share your own in return.',
      cta: 'Ask for a tandem',
      meta: ['For CASA learners', 'For people in Bremen'],
      sidesTitle: 'Two sides, one tandem',
      learnerTitle: 'You are learning German at CASA',
      learnerText:
        'Practise your German in conversation with someone from Bremen and see the city from a new angle. In return, you help your partner learn your language.',
      bremenTitle: 'You speak German and live in Bremen',
      bremenText:
        'We are also looking for German-speaking tandem partners. Practise another language and meet people from many countries who are learning German at CASA.',
      stepsEyebrow: 'How it works',
      stepsTitle: 'How it works',
      stepsText: 'From the form to your first meeting, we are with you.',
      steps: [
        { title: 'Fill in the form', description: 'Write to us and tell us which language you speak and which one you would like to learn or improve.' },
        { title: 'We look for you', description: 'We look for a suitable tandem partner for you.' },
        { title: 'First meeting at CASA', description: 'As soon as we have found someone, we get in touch and arrange a first meeting with you both here at the school.' },
        { title: 'Carry on as a tandem', description: 'If you would like to keep meeting, you swap contact details. You are also welcome to carry on meeting at the school.' },
      ],
      benefitsTitle: 'What a tandem gives you',
      benefits: [
        'You refresh and improve your language skills.',
        'You speak more and feel more confident in everyday life.',
        'You get to know new people and their culture.',
        'You use what you learn in class in real conversations.',
      ],
      closingTitle: 'Ready for your tandem?',
      closingText: 'Tell us which languages you speak and which one you would like to practise. We will take care of the rest.',
    },
  });

  const breadcrumbs = [
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: say(locale, 'Ressourcen', 'Resources'), href: '/news' },
    { label: t.eyebrow },
  ];

  const sides = [
    { key: 'learner', icon: tandemIcons3d.learner, title: t.learnerTitle, text: t.learnerText },
    { key: 'bremen', icon: tandemIcons3d.bremen, title: t.bremenTitle, text: t.bremenText },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <TandemDialog locale={locale} />

      <HeroEMinimal
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.intro}
        breadcrumbs={breadcrumbs}
        cta={{ label: t.cta, href: `#${TANDEM_ANCHOR}`, kind: 'primary' }}
        meta={[...t.meta]}
      />

      {/* The two sides of a tandem, as two objects to choose from: each opens the same form. */}
      <section className="py-14 md:py-20" aria-labelledby="tandem-sides">
        <Container>
          <h2 id="tandem-sides" className="sr-only">{t.sidesTitle}</h2>
          <ul className="grid gap-5 md:grid-cols-2">
            {sides.map((side) => (
              <li key={side.key} className="flex">
                <article data-icon-3d-host className="flex w-full flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
                  <Icon3D icon={side.icon} size="lg" />
                  <h3 className="mt-5 text-xl font-bold leading-snug text-[var(--casa-ink)] md:text-2xl">{side.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{side.text}</p>
                  <TextCta href={FORM} className="mt-auto self-start pt-6">{t.cta}</TextCta>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="pb-14 md:pb-20">
        <Container>
          <ProcessSteps
            eyebrow={t.stepsEyebrow}
            title={t.stepsTitle}
            description={t.stepsText}
            steps={t.steps.map((step, index) => ({ step: String(index + 1), ...step }))}
          />
        </Container>
      </section>

      <section className="pb-16 md:pb-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <h2 className="text-balance text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">{t.benefitsTitle}</h2>
              <span className="casa-tricolor-rule mt-7 block h-1 w-28 rounded-full md:w-36" aria-hidden />
            </div>
            <div>
              <ul className="grid border-t border-[color:var(--casa-sand)] sm:grid-cols-2 sm:gap-x-8">
                {t.benefits.map((item) => (
                  <li key={item} className="flex items-start gap-3 border-b border-[color:var(--casa-sand)] py-4 text-base leading-relaxed text-[var(--casa-ink)]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
                <h3 className="text-xl font-bold text-[var(--casa-ink)]">{t.closingTitle}</h3>
                <p className="mt-2 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{t.closingText}</p>
                <Button
                  asChild
                  className="mt-5 h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
                >
                  <Link href={FORM}>{t.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
